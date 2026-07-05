import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../firebaseError';
import { UserProfile, Call } from '../types';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Shield, User, X, ShieldAlert, RotateCw, Video, VideoOff, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { triggerPushNotification } from '../utils/notifications';

interface VoiceCallProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  callId?: string;
  isIncoming?: boolean;
  initialType?: 'voice' | 'video';
  onEnd: () => void;
}

export default function VoiceCall({ currentUser, otherUser, callId, isIncoming, initialType = 'voice', onEnd }: VoiceCallProps) {
  const [status, setStatus] = useState<'calling' | 'ongoing' | 'ended' | 'reconnecting'>('calling');
  const [callType, setCallType] = useState<'voice' | 'video'>(initialType);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialType === 'video');
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true);
  const [timer, setTimer] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const callingSoundRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [currentCallId, setCurrentCallId] = useState<string | undefined>(callId);
  const iceCandidatesBuffer = useRef<RTCIceCandidateInit[]>([]);

  const servers = {
    iceServers: [
      { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    ],
    iceCandidatePoolSize: 10,
  };

  // Play calling ringback sound for outgoing calls
  useEffect(() => {
    if (status === 'calling' && !isIncoming) {
      if (!callingSoundRef.current) {
        callingSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
        callingSoundRef.current.loop = true;
      }
      callingSoundRef.current.play().catch(err => {
        console.warn('Audio play blocked. User must interact with document first.', err);
      });
    } else {
      if (callingSoundRef.current) {
        callingSoundRef.current.pause();
        callingSoundRef.current.currentTime = 0;
      }
    }
  }, [status, isIncoming]);

  // Handle WebRTC signaling setup
  useEffect(() => {
    let isMounted = true;

    const setupRTC = async () => {
      // Determine final call type (especially for incoming calls)
      let finalCallType = callType;
      if (isIncoming && callId) {
        try {
          const callDocSnap = await getDoc(doc(db, 'calls', callId));
          if (callDocSnap.exists()) {
            const data = callDocSnap.data() as Call;
            if (data.type) {
              setCallType(data.type);
              finalCallType = data.type;
              setIsVideoEnabled(data.type === 'video');
            }
          }
        } catch (e) {
          console.error("Error reading call type:", e);
        }
      }

      const pc = new RTCPeerConnection(servers);
      pcRef.current = pc;

      try {
        // Enforce audio and optionally video constraints
        const constraints = {
          audio: true,
          video: finalCallType === 'video' ? {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } : false
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn('Failed to obtain camera/mic with constraints. Falling back to audio-only.', err);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setIsVideoEnabled(false);
          setCallType('voice');
        }

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          pc.close();
          return;
        }

        localStreamRef.current = stream;
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Display local video stream instantly
        if (localVideoRef.current && stream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = stream;
        }

        // Handle remote tracks addition
        pc.ontrack = (event) => {
          console.log('Remote track received:', event.track.kind);
          
          if (event.streams && event.streams[0]) {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
            if (audioRef.current) {
              audioRef.current.srcObject = event.streams[0];
            }
            remoteStreamRef.current = event.streams[0];
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'failed') {
            console.log('ICE Connection failing. Restarting...');
            try {
              pc.restartIce();
            } catch (e) {
              console.warn('ICE restart failed:', e);
            }
          }
        };

        pc.onconnectionstatechange = () => {
          if (!isMounted) return;
          console.log('WebRTC Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setStatus('ongoing');
          }
          if (pc.connectionState === 'disconnected') {
            setStatus('reconnecting');
          }
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            if (status === 'ongoing' || pc.connectionState === 'closed') {
              onEnd();
            }
          }
        };

        if (isIncoming && callId) {
          // Join Call (Answerer Mode)
          const callDoc = doc(db, 'calls', callId);
          const offerCandidates = collection(callDoc, 'offerCandidates');
          const answerCandidates = collection(callDoc, 'answerCandidates');

          pc.onicecandidate = (e) => {
            if (e.candidate) {
              addDoc(answerCandidates, e.candidate.toJSON()).catch(err => {
                console.error("Error adding answer ICE candidate:", err);
              });
            }
          };

          const snap = await getDoc(callDoc);
          if (!snap.exists()) {
            onEnd();
            return;
          }

          const data = snap.data() as Call;
          if (data.offer) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await updateDoc(callDoc, { 
            answer: { type: answer.type, sdp: answer.sdp },
            status: 'ongoing'
          });

          // Sync call status in real-time
          const unsubStatus = onSnapshot(callDoc, (s) => {
            const data = s.data();
            if (data?.status === 'ended' || data?.status === 'rejected') {
              onEnd();
            }
          }, (err) => handleFirestoreError(err, OperationType.GET, 'calls'));

          // Buffer/apply offer candidate signals from remote caller
          const unsubOfferCandidates = onSnapshot(offerCandidates, (s) => {
            s.docChanges().forEach(c => {
              if (c.type === 'added') {
                const candidateData = c.doc.data();
                if (pc.currentRemoteDescription) {
                  pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch(e => console.warn(e));
                } else {
                  iceCandidatesBuffer.current.push(candidateData as RTCIceCandidateInit);
                }
              }
            });
          });

          return () => {
            unsubStatus();
            unsubOfferCandidates();
          };

        } else {
          // Place Call (Caller Mode)
          const callDocRef = await addDoc(collection(db, 'calls'), {
            callerId: currentUser.uid,
            callerName: currentUser.displayName || 'User',
            callerPhoto: currentUser.photoURL || '',
            receiverId: otherUser.uid,
            participants: [currentUser.uid, otherUser.uid],
            status: 'calling',
            type: finalCallType,
            timestamp: serverTimestamp(),
          });
          setCurrentCallId(callDocRef.id);

          triggerPushNotification(
            [otherUser.uid],
            `Incoming ${finalCallType === 'video' ? 'Video' : 'Voice'} Call`,
            `${currentUser.displayName || 'User'} is calling you...`,
            'call',
            {
              callId: callDocRef.id,
              callerId: currentUser.uid,
              callerName: currentUser.displayName || 'User',
              callerPhoto: currentUser.photoURL || '',
              callType: finalCallType
            }
          ).catch(e => console.error('Call push notification failed:', e));

          const offerCandidates = collection(callDocRef, 'offerCandidates');
          const answerCandidates = collection(callDocRef, 'answerCandidates');

          pc.onicecandidate = (e) => {
            if (e.candidate) {
              addDoc(offerCandidates, e.candidate.toJSON()).catch(err => {
                console.error("Error adding offer ICE candidate:", err);
              });
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await updateDoc(callDocRef, { offer: { type: offer.type, sdp: offer.sdp } });

          // Listen for incoming answer signals and status updates
          const unsubscribeCall = onSnapshot(callDocRef, (s) => {
            const data = s.data() as Call;
            if (data?.answer && !pc.currentRemoteDescription) {
              pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(e => console.warn(e));
            }
            if (data?.status === 'ongoing' && status === 'calling') {
              setStatus('ongoing');
            }
            if (data?.status === 'ended' || data?.status === 'rejected') {
              onEnd();
            }
          });

          // Buffer/apply answer candidate signals from remote receiver
          const unsubscribeICE = onSnapshot(answerCandidates, (s) => {
            s.docChanges().forEach(c => {
              if (c.type === 'added') {
                const candidateData = c.doc.data();
                if (pc.currentRemoteDescription) {
                  pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch(e => console.warn(e));
                } else {
                  iceCandidatesBuffer.current.push(candidateData as RTCIceCandidateInit);
                }
              }
            });
          });

          return () => {
            unsubscribeCall();
            unsubscribeICE();
          };
        }
      } catch (err: any) {
        console.error('WebRTC initialization or signaling error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('permission')) {
          setPermissionError("کیمرہ یا مائیکروفون تک رسائی حاصل نہیں کی جا سکی۔ براہ کرم پرمیشنز کی توثیق کریں۔");
        } else {
          setPermissionError(`ایرر: ${err.message || 'نامعلوم غلطی'}`);
        }
      }
    };

    setupRTC();
    return () => { isMounted = false; };
  }, []);

  // Flush any buffered ICE candidates once remote description is set
  useEffect(() => {
    if (pcRef.current?.currentRemoteDescription && iceCandidatesBuffer.current.length > 0) {
      iceCandidatesBuffer.current.forEach(c => {
        pcRef.current?.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn(e));
      });
      iceCandidatesBuffer.current = [];
    }
  }, [pcRef.current?.currentRemoteDescription]);

  // Handle active call duration timer
  useEffect(() => {
    let interval: any;
    if (status === 'ongoing') {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleEndCall = async () => {
    if (currentCallId) {
      await updateDoc(doc(db, 'calls', currentCallId), { status: 'ended' }).catch(() => {});
    }
    closeMediaAndConnection();
    onEnd();
  };

  const closeMediaAndConnection = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    if (callingSoundRef.current) {
      callingSoundRef.current.pause();
      callingSoundRef.current.currentTime = 0;
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      } else if (callType === 'voice') {
        // Fallback or request upgrades from voice to video
        alert("Converting ongoing voice calls to video requires a browser page reload to request camera streams.");
      }
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isVideoCallMode = callType === 'video';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-[#0B1014] text-white flex flex-col items-center justify-between pb-12 overflow-hidden select-none"
    >
      {/* Background/Video Streams Layout */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black">
        {isVideoCallMode ? (
          <>
            {/* Fullscreen Remote Video Stream */}
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                (!remoteStreamRef.current || !isRemoteVideoEnabled) && "opacity-0 scale-95"
              )}
            />
            
            {/* Fallback View if remote user has video disabled */}
            {(!remoteStreamRef.current || !isRemoteVideoEnabled) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B1014] z-10">
                <div className="absolute inset-0 opacity-20 filter blur-2xl scale-125">
                  <img 
                    src={otherUser.photoURL || `https://ui-avatars.com/api/?name=${otherUser.displayName}&background=00a884&color=fff&size=256`}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
                <div className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-[#00A884] to-[#25D366] mb-4">
                  <img 
                    src={otherUser.photoURL || `https://ui-avatars.com/api/?name=${otherUser.displayName}&background=00a884&color=fff&size=256`}
                    className="w-full h-full rounded-full object-cover border-4 border-[#0B1014]"
                    alt=""
                  />
                </div>
                <p className="text-[#8696A0] text-sm font-medium">{otherUser.displayName}'s video is off</p>
              </div>
            )}

            {/* Small Floating Local Video Stream Preview */}
            <motion.div 
              drag
              dragConstraints={{ left: -20, right: 320, top: -20, bottom: 500 }}
              dragElastic={0.1}
              dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
              className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-40 bg-[#1e2a30] cursor-grab active:cursor-grabbing hover:border-white/40 transition-colors"
            >
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={cn(
                  "w-full h-full object-cover",
                  !isVideoEnabled && "opacity-0"
                )}
              />
              
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1e2a30]">
                  <VideoOff className="text-gray-400 w-8 h-8" />
                </div>
              )}
            </motion.div>
          </>
        ) : (
          /* Pure Voice Call Background elements */
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#25D366]/15 rounded-full blur-[150px] animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-[#00A884]/15 rounded-full blur-[150px]" />
          </div>
        )}
      </div>

      {/* Top Header Information Overlay */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm mt-12 px-6">
        <div className="flex items-center gap-2 text-[#8696A0] mb-8 bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-lg">
          <Shield size={14} className="text-[#00A884]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">End-to-End Encrypted</span>
        </div>

        {/* User Info (Show avatar prominently if voice call or if video call remote state is empty) */}
        {!isVideoCallMode && (
          <div className="relative group p-4 mb-2">
            <motion.div 
              animate={{ 
                scale: status === 'ongoing' ? [1, 1.05, 1] : 1,
                opacity: status === 'ongoing' ? [0.2, 0.4, 0.2] : 0
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-[#25D366] rounded-full blur-3xl opacity-20"
            />
            <div className="relative w-40 h-40 rounded-full p-1 bg-gradient-to-tr from-[#25D366] via-[#00A884] to-[#128C7E] shadow-[0_0_50px_rgba(37,211,102,0.3)]">
              <img 
                src={otherUser.photoURL || `https://ui-avatars.com/api/?name=${otherUser.displayName}&background=random&color=fff&size=256`}
                className="w-full h-full rounded-full border-[6px] border-[#0B1014] object-cover"
                alt={otherUser.displayName || 'User'}
                referrerPolicy="no-referrer"
              />
            </div>
            
            <AnimatePresence>
              {status === 'ongoing' && (
                <motion.div 
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#ef4444] px-4 py-1.5 rounded-full text-[10px] font-black shadow-[0_4px_15px_rgba(239,68,68,0.4)] border border-white/20"
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                  REC • LIVE
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className={cn("text-center", isVideoCallMode ? "mt-2 bg-black/40 p-4 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl" : "mt-6")}>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-black tracking-tight text-white mb-2"
          >
            {otherUser.displayName}
          </motion.h2>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[#8696A0] font-bold text-base tracking-wide Urdu">
              {status === 'reconnecting' ? (
                <span className="text-yellow-500 flex items-center gap-2">
                   <RotateCw size={14} className="animate-spin" /> دوبارہ منسلک ہو رہا ہے...
                </span>
              ) : status === 'calling' ? (
                <span className="flex items-center gap-2">کال ہو رہی ہے...</span>
              ) : (
                <span className="text-[#25D366] tabular-nums font-mono text-2xl drop-shadow-[0_0_10px_rgba(37,211,102,0.4)]">
                  {formatTime(timer)}
                </span>
              )}
            </p>
          </div>
        </div>

        {permissionError && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-red-500/20 border border-red-500/30 p-4 rounded-2xl text-red-400 text-sm text-center Urdu backdrop-blur-sm max-w-[280px]"
          >
            <ShieldAlert size={20} className="mx-auto mb-2 text-red-500" />
            {permissionError}
          </motion.div>
        )}
      </div>

      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      {/* Control Actions Panel Overlay */}
      <div className="relative z-10 w-full max-w-xs flex flex-col gap-10 px-6">
        <div className="flex items-center justify-around bg-black/45 backdrop-blur-lg border border-white/10 p-5 rounded-[32px] shadow-2xl">
          {/* Mute Mic Button */}
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md relative overflow-hidden group",
              isMuted ? "bg-white text-[#0B1014]" : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
            )}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </motion.button>

          {/* Toggle Video Camera (Only available in Video Call mode) */}
          {isVideoCallMode && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleCamera}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md relative overflow-hidden group",
                !isVideoEnabled ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
              )}
              title={isVideoEnabled ? "Turn Camera Off" : "Turn Camera On"}
            >
              {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
            </motion.button>
          )}

          {/* Speaker Phone Button */}
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md relative overflow-hidden group",
              !isSpeaker ? "bg-white text-[#0B1014]" : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
            )}
            title={isSpeaker ? "Speaker On" : "Speaker Off"}
          >
            {isSpeaker ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </motion.button>
        </div>

        {/* Hang Up Action Button */}
        <div className="flex justify-center">
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 135 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleEndCall}
            className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-[0_15px_40px_rgba(239,68,68,0.5)] border border-red-400/20 hover:bg-red-600 transition-all duration-500 group"
            title="Hang Up"
          >
            <PhoneOff size={32} className="text-white transform group-hover:rotate-12 transition-transform duration-300" />
          </motion.button>
        </div>
      </div>
      
      {/* Voice Call Pure Waveform (Disabled for Video Calls to preserve camera performance) */}
      {!isVideoCallMode && (
        <div className="absolute bottom-48 left-0 w-full flex items-center justify-center gap-2 opacity-40 pointer-events-none px-12 z-0">
          {[2, 5, 8, 4, 3, 6, 9, 7, 5, 3, 6, 8, 4, 2].map((h, i) => (
            <motion.div 
              key={i}
              animate={{ 
                height: status === 'ongoing' ? [h*3.5, h*9, h*3.5] : h*3.5,
                opacity: status === 'ongoing' ? [0.3, 0.9, 0.3] : 0.3
              }}
              transition={{ 
                duration: 0.6, 
                repeat: Infinity, 
                delay: i * 0.04,
                ease: "easeInOut"
              }}
              className="flex-1 bg-gradient-to-t from-[#25D366] to-[#00A884] rounded-full"
              style={{ height: h * 3.5 }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
