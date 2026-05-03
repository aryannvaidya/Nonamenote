import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ChevronDown } from 'lucide-react';

export default function NoteViewer() {
  const { id } = useParams<{ id: string }>();
  const [viewingData, setViewingData] = useState<any>(null);
  const [isNoteLoading, setIsNoteLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'error' | null; message: string }>({ type: null, message: '' });
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [animationStage, setAnimationStage] = useState<'idle' | 'animating' | 'revealed'>('idle');

  // ... (audio logic remains same)
  
  useEffect(() => {
    if (animationStage === 'revealed' && contentRef.current) {
      const checkScroll = () => {
        const el = contentRef.current?.querySelector('[contenteditable="false"]');
        if (el) {
          setShowScrollArrow(el.scrollHeight > el.clientHeight);
        }
      };
      
      const timer = setTimeout(checkScroll, 1000); // Wait for animation and rendering
      return () => clearTimeout(timer);
    }
  }, [animationStage]);

  // Programmatic sound generator
  const playRustle = () => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < data.length; i++) {
        // High frequency noise with exponential decay for a rustle effect
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12)) * 0.5;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1200;
      
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.start();
    } catch (e) {
      console.error("Audio generation failed", e);
    }
  };

  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [hasReplied, setHasReplied] = useState(false);

  useEffect(() => {
    if (id) {
      fetchNote(id);
      const replied = JSON.parse(localStorage.getItem('repliedNotes') || '[]');
      if (replied.includes(id)) {
        setHasReplied(true);
      }
    }
  }, [id]);

  const submitReply = async () => {
    if (!replyText.trim() || isSendingReply || hasReplied || !id) return;
    
    setIsSendingReply(true);
    try {
      const response = await fetch('/api/save-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          noteId: id,
          message: replyText
        })
      });
      
      if (!response.ok) throw new Error('Failed to send reply');
      
      const replied = JSON.parse(localStorage.getItem('repliedNotes') || '[]');
      replied.push(id);
      localStorage.setItem('repliedNotes', JSON.stringify(replied));
      setHasReplied(true);
      setReplyText('');
    } catch (e) {
      console.error("Failed to send reply", e);
    } finally {
      setIsSendingReply(false);
    }
  };

  const fetchNote = async (noteId: string) => {
    setIsNoteLoading(true);
    try {
      const response = await fetch('/api/get-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId })
      });
      if (!response.ok) {
        setStatus({ type: 'error', message: "This note has expired or doesn't exist" });
      } else {
        const { note } = await response.json();
        setViewingData(note);
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: "Error fetching note" });
    } finally {
      setIsNoteLoading(false);
    }
  };

  const startAnimation = async () => {
    if (!viewingData || !id || animationStage !== 'idle') return;
    
    playRustle();
    setAnimationStage('animating');
    
    // Total sequence ~4s
    setTimeout(() => {
      setAnimationStage('revealed');
    }, 3800);
  };

  if (isNoteLoading) {
    return (
      <div className="fixed inset-0 bg-[#000] flex items-center justify-center z-[9999]">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[#b89e7a] rounded-full animate-spin" />
      </div>
    );
  }

  if (status.type === 'error') {
    return (
      <div className="fixed inset-0 bg-[#000] flex flex-col items-center justify-center p-8 text-center z-[9999] overflow-hidden">
        <div className="mb-10 text-9xl">✉️</div>
        <h2 className="font-sans text-white text-2xl md:text-3xl mb-10 tracking-tight font-light border-0 mt-0">
          {status.message}
        </h2>
        <Link 
          to="/"
          className="px-10 py-5 bg-white text-black font-bold uppercase tracking-[0.2em] text-xs hover:bg-gray-200 transition-all rounded-sm"
        >
          Send your own note →
        </Link>
      </div>
    );
  }

  const isThemeBgClass = viewingData?.theme_bg?.startsWith('bg-');
  const particles = Array.from({ length: 25 });

  return (
    <div className="min-h-screen bg-black text-[#d3c5ad] selection:bg-[#b89e7a] selection:text-black overflow-y-auto custom-scrollbar relative">
      {/* Background Transition */}
      <AnimatePresence>
        {animationStage === 'revealed' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className={`fixed inset-0 w-full h-full z-0 transition-colors duration-1000 ${isThemeBgClass ? viewingData.theme_bg : ''}`}
            style={!isThemeBgClass ? { backgroundColor: viewingData?.theme_bg || '#000' } : {}}
          />
        )}
      </AnimatePresence>

      <div className={`relative w-full min-h-screen flex flex-col items-center justify-center p-4 ${animationStage === 'revealed' ? 'pt-20 pb-20' : ''}`}>
        <AnimatePresence mode="wait">
          {animationStage !== 'revealed' ? (
            <motion.div 
              key="envelope-stage"
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center justify-center w-full"
              onClick={startAnimation}
            >
              {/* Background Dust */}
              <div className="dust-container">
                {particles.map((_, i) => (
                  <div 
                    key={i} 
                    className="dust"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      width: `${Math.random() * 2 + 1}px`,
                      height: `${Math.random() * 2 + 1}px`,
                      animationDelay: `${Math.random() * 10}s`,
                      animationDuration: `${15 + Math.random() * 10}s`
                    }}
                  />
                ))}
              </div>

              <div className={`envelope-wrapper ${animationStage === 'animating' ? 'envelope-opening' : ''}`}>
                <div className="envelope">
                  <div className="envelope-back-flap" />
                  <div className="envelope-letter" />
                  <div className="envelope-front-left" />
                  <div className="envelope-front-right" />
                  
                  {/* Wax Seal with Shards */}
                  <div className="wax-seal-wrapper">
                    <div className="seal-main">N</div>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="shard"
                        style={{
                          '--shard-dest': `translate(${(Math.random() - 0.5) * 200}px, ${(Math.random() - 0.5) * 200}px)`,
                          '--shard-rot': `${Math.random() * 360}deg`,
                          top: '50%',
                          left: '50%',
                          animationDelay: `${Math.random() * 0.1}s`
                        } as any}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Labels */}
              <div className={`mt-20 flex flex-col items-center gap-2 transition-all duration-700 ${animationStage === 'animating' ? 'opacity-0 scale-90 translate-y-12' : 'opacity-100 translate-y-0'}`}>
                <p className="text-[#d4a843] font-mono text-[10px] tracking-[0.5em] uppercase font-black" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
                  Private Transmission
                </p>
                <p className="text-white/30 text-[8px] uppercase tracking-[0.2em] font-medium" style={{ animation: 'labelPulse 2s ease-in-out infinite' }}>
                  Tap anywhere to reveal content
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="note-stage"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center gap-12 w-full max-w-4xl"
            >
              <div className="w-full text-center opacity-30">
                <p className="text-[10px] uppercase tracking-[0.5em] font-black">— Secure Transmission Resolved —</p>
              </div>

              {/* Note Container (Fixed height) */}
              <div 
                className="relative w-full max-w-[600px] h-[900px] shadow-[0_60px_120px_rgba(0,0,0,0.6)] rounded-sm overflow-hidden group border border-white/5 bg-black"
                ref={contentRef}
              >
                <div 
                  className="w-full h-full note-viewer-card-wrapper"
                  dangerouslySetInnerHTML={{ 
                    __html: (viewingData?.noteHTML || "")
                      .replace(/contenteditable="true"/g, 'contenteditable="false"')
                  }}
                />
                
                {/* Bottom Fade Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-10" />
                
                {/* Scroll Indicator Arrow */}
                <AnimatePresence>
                  {showScrollArrow && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-white pointer-events-none animate-bounce"
                    >
                      <ChevronDown size={24} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reply Section */}
              <div className="w-full max-w-[600px] flex flex-col items-center gap-6 bg-black/40 backdrop-blur-md p-8 rounded-sm border border-white/5 shadow-2xl">
                {hasReplied ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-2"
                  >
                    <p className="text-[#d4a843] text-[11px] tracking-[0.5em] font-black uppercase">
                       Reply Sent ✓
                    </p>
                  </motion.div>
                ) : (
                  <div className="w-full flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase tracking-[0.5em] font-black text-[#d3c5ad]">Reply</span>
                    </div>
                    
                    <div className="relative group">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                        placeholder="Type your response..."
                        className="w-full bg-white/[0.03] border border-white/10 rounded-sm p-4 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#d4a843]/40 transition-all resize-none h-32 font-serif"
                      />
                      <div className="absolute bottom-3 right-3 text-[8px] font-mono text-white/20 tracking-widest">
                        {replyText.length}/500
                      </div>
                    </div>

                    <button
                      onClick={submitReply}
                      disabled={!replyText.trim() || isSendingReply}
                      className="w-full py-4 bg-[#b89e7a] text-black text-[10px] uppercase tracking-[0.4em] font-black hover:bg-[#c9bda4] disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg"
                    >
                      {isSendingReply ? 'Dispatching...' : 'Send Reply'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-6 mt-12 pb-10">
                <p className="text-[10px] uppercase tracking-[0.5em] font-black text-white/90">Sent via NoNameNote System</p>
                <Link 
                  to="/"
                  className="group text-[12px] uppercase tracking-[0.6em] font-black text-[#b89e7a] border-b-2 border-[#b89e7a]/30 pb-2 hover:border-[#b89e7a] transition-all flex items-center gap-3"
                >
                  Send your own note
                  <span className="group-hover:translate-x-2 transition-transform">→</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --note-scale: 1;
        }
        @media (max-width: 640px) {
          :root { --note-scale: 0.85; }
        }
        @media (max-width: 480px) {
          :root { --note-scale: 0.75; }
        }
        @media (max-width: 380px) {
          :root { --note-scale: 0.65; }
        }
        #viewer-container [contenteditable] {
          outline: none !important;
          cursor: default !important;
        }
        .note-viewer-card-wrapper #note-card {
          height: 100% !important;
          min-height: 100% !important;
          max-height: 100% !important;
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          padding: 2.5rem !important;
          position: relative !important;
          overflow: hidden !important;
        }
        .note-viewer-card-wrapper #note-card #stamp {
          position: absolute !important;
          top: 2.5rem !important;
          right: 2.5rem !important;
          z-index: 5 !important;
          pointer-events: none !important;
        }
        .note-viewer-card-wrapper #note-card > div[contenteditable="false"] {
          overflow-y: auto !important;
          flex: 1 !important;
          padding-right: 0.5rem;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .note-viewer-card-wrapper #note-card > div[contenteditable="false"]::-webkit-scrollbar {
          width: 4px;
        }
        .note-viewer-card-wrapper #note-card > div[contenteditable="false"]::-webkit-scrollbar-track {
          background: transparent;
        }
        .note-viewer-card-wrapper #note-card > div[contenteditable="false"]::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }

        /* Envelope Animations Re-restored */
        .envelope-wrapper {
          position: relative;
          width: 300px;
          height: 200px;
          perspective: 1000px;
          cursor: pointer;
        }
        .envelope {
          position: relative;
          width: 100%;
          height: 100%;
          background: #1a1a1a;
          transform-style: preserve-3d;
          transition: transform 1s;
        }
        .envelope-opening .envelope {
          transform: translateY(100px) rotateX(10deg);
        }
        .envelope-back-flap {
          position: absolute;
          width: 100%;
          height: 100%;
          background: #1a1a1a;
          clip-path: polygon(0 0, 50% 50%, 100% 0, 100% 100%, 0 100%);
          z-index: 1;
        }
        .envelope-letter {
          position: absolute;
          width: 90%;
          height: 80%;
          background: #d3c5ad;
          left: 5%;
          top: 10%;
          z-index: 2;
          transition: transform 1s 0.5s;
        }
        .envelope-opening .envelope-letter {
          transform: translateY(-150px);
        }
        .envelope-front-left {
          position: absolute;
          width: 100%;
          height: 100%;
          background: #2a2a2a;
          clip-path: polygon(0 0, 50% 50%, 0 100%);
          z-index: 3;
        }
        .envelope-front-right {
          position: absolute;
          width: 100%;
          height: 100%;
          background: #2a2a2a;
          clip-path: polygon(100% 0, 50% 50%, 100% 100%);
          z-index: 3;
        }
        .wax-seal-wrapper {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          width: 50px;
          height: 50px;
        }
        .seal-main {
          width: 100%;
          height: 100%;
          background: #b89e7a;
          border-radius: 50%;
          display: flex;
          items-center: center;
          justify-content: center;
          color: black;
          font-weight: bold;
          font-family: serif;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          transition: opacity 0.3s;
        }
        .envelope-opening .seal-main {
          opacity: 0;
        }
        .shard {
          position: absolute;
          width: 15px;
          height: 15px;
          background: #b89e7a;
          clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
          opacity: 0;
        }
        .envelope-opening .shard {
          animation: shardOut 1s forwards;
        }
        @keyframes shardOut {
          0% { opacity: 1; transform: translate(-50%, -50%) rotate(0deg); }
          100% { opacity: 0; transform: var(--shard-dest) rotate(var(--shard-rot)); }
        }
        .dust-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: -1;
        }
        .dust {
          position: absolute;
          background: #b89e7a;
          border-radius: 50%;
          opacity: 0.2;
          animation: dustFall linear infinite;
        }
        @keyframes dustFall {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.2; }
          90% { opacity: 0.2; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes labelPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.1; transform: scale(0.98); }
        }
      `}} />
    </div>
  );
}
