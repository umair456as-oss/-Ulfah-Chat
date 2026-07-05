import { useState } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, ShieldCheck, CircleDashed, Users, Phone, Compass, Share2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import { cn } from '../utils';

interface SidebarProps {
  profile: UserProfile;
  selectedChat?: any;
}

export default function Sidebar({ profile, selectedChat }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    let shareUrl = window.location.origin;
    let title = 'ChatApp';
    let text = 'Join me on ChatApp!';

    if (selectedChat?.isGroup && selectedChat?.uid) {
      shareUrl = `${window.location.origin}/?join=${selectedChat.uid}`;
      title = selectedChat.displayName || 'Community Invite';
      text = `Join my community "${selectedChat.displayName || 'Community'}" on ChatApp!`;
    }

    const shareData = {
      title,
      text,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        console.warn('Web Share failed or cancelled, falling back to clipboard copy:', err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const navItems = [
    { path: '/', label: 'Chats', icon: MessageCircle },
    { path: '/status', label: 'Updates', icon: CircleDashed },
    { path: '/contacts', label: 'Communities', icon: Users },
    { path: '/explore', label: 'Explore', icon: Compass },
  ];

  if (profile.role === 'admin' || profile.email === 'abdulrehmanhabib.com@gmail.com') {
    navItems.push({ path: '/admin', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <div className="fixed-footer w-full bg-white/80 backdrop-blur-xl border-t border-gray-100 flex flex-col items-center z-50 safe-area-bottom shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
      <div className="flex flex-row items-center justify-around w-full max-w-screen-xl mx-auto h-[65px] px-2">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center flex-1 h-full relative group"
            >
              <div className="relative">
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-300 relative z-10",
                  isActive ? "text-[#00a884]" : "text-[#54656F] group-hover:text-[#00a884]"
                )}>
                  <Icon className={cn("w-6 h-6 transition-transform duration-300", isActive && "scale-110")} />
                </div>
                
                {isActive && (
                  <motion.div
                    layoutId="sidebar-nav-active"
                    className="absolute inset-[-4px] bg-[#D9FDD3] rounded-2xl -z-0"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </div>
              
              <span className={cn(
                "text-[10px] font-bold mt-1 transition-all duration-300",
                isActive ? "text-[#075E54] opacity-100 scale-100" : "text-[#54656F] opacity-70 scale-95"
              )}>
                {item.label}
              </span>

              {/* Unread Indicator placeholder */}
              {item.path === '/' && (
                <div className="absolute top-2 right-1/4 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </motion.button>
          );
        })}

        {/* Share App Action Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleShare}
          className="flex flex-col items-center justify-center flex-1 h-full relative group"
        >
          <div className="relative">
            <div className={cn(
              "p-1.5 rounded-xl transition-all duration-300 relative z-10",
              copied ? "text-[#00a884]" : "text-[#54656F] group-hover:text-[#00a884]"
            )}>
              <Share2 className={cn("w-6 h-6 transition-transform duration-300", copied && "scale-110 text-[#00a884]")} />
            </div>
            
            {copied && (
              <motion.div
                layoutId="sidebar-share-active"
                className="absolute inset-[-4px] bg-[#D9FDD3] rounded-2xl -z-0"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </div>
          
          <span className={cn(
            "text-[10px] font-bold mt-1 transition-all duration-300",
            copied ? "text-[#075E54] opacity-100 scale-100" : "text-[#54656F] opacity-70 scale-95"
          )}>
            {copied ? 'Copied!' : 'Share'}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
