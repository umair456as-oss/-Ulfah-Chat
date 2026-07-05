import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  ExternalLink, 
  AlertTriangle, 
  RefreshCw,
  Search,
  BookOpen,
  Bot,
  User,
  Compass,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { cn } from '../utils';

interface Source {
  title: string;
  uri: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Source[];
}

export default function NoorAIChat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('noor_ai_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem('noor_ai_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to persist chat history", e);
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (!textToSend) {
      setInput('');
    }

    setError(null);

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/noor-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate response');
      }

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || []
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (window.confirm('کیا آپ اس گفتگو کو حذف کرنا چاہتے ہیں؟ (Are you sure you want to clear this chat?)')) {
      setMessages([]);
      setError(null);
    }
  };

  const samplePrompts = [
    { text: 'آج کی ایک اچھی بات بتائیں', urdu: 'آج کی ایک اچھی بات بتائیں' },
    { text: 'قرآن پاک میں صبر کی کیا تعلیمات ہیں؟', urdu: 'قرآن پاک میں صبر کی کیا تعلیمات ہیں؟' },
    { text: 'Darul Ifta Karachi fatwas about digital transaction', urdu: 'دارالافتاء کراچی کے ڈیجیٹل لین دین پر فتاویٰ' },
    { text: 'فضیلتِ نمازِ تہجد پر روشنی ڈالیں', urdu: 'فضیلتِ نمازِ تہجد پر روشنی ڈالیں' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21] overflow-hidden">
      {/* Header */}
      <div className="bg-[#00a884] dark:bg-[#202c33] p-4 pt-10 pb-4 shadow-lg z-10 safe-area-top flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={18} className="text-amber-200 animate-pulse shrink-0" />
              <h2 className="text-xl font-bold Urdu">نور اے آئی (Noor AI)</h2>
            </div>
            <p className="text-white/80 text-[11px] Urdu">آن لائن اسلامی اسسٹنٹ (With Google Search Grounding)</p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title="Clear Chat"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-5 pointer-events-none" />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800 relative z-10">
          {messages.length === 0 ? (
            <div className="max-w-md mx-auto my-6 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-[#202c33] p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 space-y-5"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-[#00a884]">
                  <Sparkles size={36} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#111b21] dark:text-[#e9edef] Urdu mb-1">
                    السلام علیکم! میں نور اے آئی ہوں
                  </h3>
                  <p className="text-xs text-[#667781] dark:text-[#8696a0] Urdu leading-relaxed">
                    میں آپ کا معتبر اسلامی ساتھی اور اسسٹنٹ ہوں۔ میں آپ کو قرآنی تعلیمات، حدیث، فقہ، اور لائیو فتاویٰ کی معلومات فراہم کر سکتا ہوں، بالکل معتبر ذرائع کے ساتھ۔
                  </p>
                </div>

                <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#667781] dark:text-[#8696a0] block mb-3">
                    مطلوبہ سوالات (Suggested Topics)
                  </span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {samplePrompts.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(p.text)}
                        className="text-left text-xs text-[#111b21] dark:text-[#e9edef] hover:bg-teal-50 dark:hover:bg-teal-950/25 p-3 rounded-xl border border-gray-100 dark:border-white/5 transition-colors duration-200 flex items-center gap-2"
                      >
                        <Compass size={14} className="text-[#00a884] shrink-0" />
                        <span className="Urdu flex-1 truncate">{p.urdu}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <div 
                  key={m.id}
                  className={cn(
                    "flex w-full",
                    m.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className="flex items-start gap-2 max-w-[85%]">
                    {m.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white shrink-0 shadow-sm mt-1">
                        <Bot size={16} />
                      </div>
                    )}
                    <div 
                      className={cn(
                        "rounded-[20px] p-3.5 shadow-sm text-sm leading-relaxed whitespace-pre-line",
                        m.role === 'user' 
                          ? "bg-[#005c4b] text-white rounded-tr-none" 
                          : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none border border-gray-100 dark:border-white/5"
                      )}
                    >
                      <span className="Urdu">{m.content}</span>

                      {/* Cited Sources section */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 space-y-1.5">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-[#667781] dark:text-[#8696a0] flex items-center gap-1">
                            <BookOpen size={10} /> تصدیق شدہ لنکس (Verified References):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {m.sources.map((s, idx) => (
                              <a
                                key={idx}
                                href={s.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f0f2f5] dark:bg-[#111b21] hover:bg-[#e1e3e6] dark:hover:bg-[#1c242b] text-[#00a884] rounded-lg text-xs font-bold transition-all max-w-full truncate"
                              >
                                <span className="truncate max-w-[150px]">{s.title}</span>
                                <ExternalLink size={10} className="shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <span className="text-[9px] text-[#667781] dark:text-[#8696a0] text-right block mt-1.5 opacity-80">
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex w-full justify-start items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white shrink-0 shadow-sm">
                <Bot size={16} />
              </div>
              <div className="bg-white dark:bg-[#202c33] rounded-[20px] rounded-tl-none p-4 shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs flex flex-col sm:flex-row items-center gap-3"
            >
              <AlertTriangle className="shrink-0 text-red-500" size={18} />
              <div className="flex-1 text-center sm:text-left Urdu">
                {error}
              </div>
              <button 
                onClick={() => handleSend()}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition-all uppercase flex items-center gap-1"
              >
                <RefreshCw size={10} /> دوبارہ کوشش کریں (Retry)
              </button>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-[#202c33] border-t border-gray-100 dark:border-white/5 flex items-center gap-2 relative z-10">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="قرآن، حدیث، فتاویٰ یا فقہ کے بارے میں سوال لکھیں..."
            className="flex-1 bg-[#f0f2f5] dark:bg-[#111b21] text-[#111b21] dark:text-[#e9edef] rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00a884] resize-none h-[42px] max-h-[120px] Urdu leading-relaxed"
            style={{ minHeight: '42px' }}
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-90",
              input.trim() && !loading
                ? "bg-[#00a884] text-white hover:bg-[#008f72] shadow-md"
                : "bg-gray-100 dark:bg-[#111b21] text-gray-400 cursor-not-allowed"
            )}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
