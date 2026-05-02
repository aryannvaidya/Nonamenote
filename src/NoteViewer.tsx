import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ChevronDown } from 'lucide-react';
import { db } from './firebase';

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
      await db.collection('notes').doc(id).collection('replies').add({
        message: replyText,
        timestamp: new Date(),
        read: false
      });
      
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
      const doc = await db.collection('notes').doc(noteId).get();
      if (!doc.exists) {
        setStatus({ type: 'error', message: "This note has expired or doesn't exist" });
      } else {
        setViewingData(doc.data());
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

    try {
      await db.collection('notes').doc(id).update({ 
        opened: true,
        openedAt: new Date()
      });
    } catch (e) {
      console.error("Failed to update opened state", e);
    }
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
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black selection:bg-white/20">
      {/* SVG Filter for Paper Grain */}
      <svg className="hidden">
        <defs>
          <filter id="paper-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="linear" slope="0.05" />
              <feFuncG type="linear" slope="0.05" />
              <feFuncB type="linear" slope="0.05" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

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

      <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${animationStage === 'animating' ? 'animating' : ''}`}>
        {animationStage !== 'revealed' && (
          <div className="viewer-overlay" onClick={startAnimation}>
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

            <div className={`envelope-wrapper ${animationStage === 'animating' ? 'envelope-fade-out' : ''}`}>
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
            <div className={`absolute bottom-20 flex flex-col items-center gap-2 transition-all duration-700 ${animationStage === 'animating' ? 'opacity-0 scale-90 translate-y-12' : 'opacity-100 translate-y-0'}`}>
              <p className="text-[#d4a843] font-mono text-[10px] tracking-[0.5em] uppercase font-black" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
                Private Transmission
              </p>
              <p className="text-white/30 text-[8px] uppercase tracking-[0.2em] font-medium" style={{ animation: 'labelPulse 2s ease-in-out infinite' }}>
                Tap anywhere to reveal content
              </p>
            </div>
          </div>
        )}

        {/* Note Content */}
        <AnimatePresence>
          {animationStage === 'revealed' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="fixed inset-0 z-10 w-full h-full flex items-center justify-center pointer-events-auto p-4"
              id="viewer-container"
            >
              <div className="flex flex-col items-center gap-6 w-full max-w-4xl transition-transform duration-500 origin-center" style={{ transform: 'scale(var(--note-scale, 1))' }}>
                <div className="w-full text-center opacity-30">
                  <p className="text-[10px] uppercase tracking-[0.5em] font-black">— Secure Transmission Resolved —</p>
                </div>

                <div 
                  className="relative w-[600px] h-[1000px] shadow-[0_60px_120px_rgba(0,0,0,0.6)] rounded-sm overflow-hidden group border border-white/5 bg-black"
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
                <div className="w-full max-w-[600px] flex flex-col items-center gap-6">
                  <div className="w-full h-[1px] bg-white/10" />
                  
                  {hasReplied ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-4"
                    >
                      <p className="text-[#d4a843] text-[10px] tracking-[0.3em] font-black uppercase">
                        Your reply has been sent anonymously ✓
                      </p>
                    </motion.div>
                  ) : (
                    <div className="w-full flex flex-col items-center gap-4">
                      <div className="flex items-center gap-3 opacity-60">
                        <span className="text-[9px] uppercase tracking-[0.5em] font-black text-white">💬 Send a reply anonymously</span>
                      </div>
                      
                      <div className="w-full relative group">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                          placeholder="Type your response..."
                          className="w-full bg-white/5 border border-white/10 rounded-sm p-4 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#d4a843]/40 transition-all resize-none h-24"
                        />
                        <div className="absolute bottom-3 right-3 text-[8px] font-mono text-white/20 tracking-widest">
                          {replyText.length}/500
                        </div>
                      </div>

                      <button
                        onClick={submitReply}
                        disabled={!replyText.trim() || isSendingReply}
                        className="w-full py-4 bg-[#d4a843] text-black text-[10px] uppercase tracking-[0.3em] font-black hover:bg-[#f0ce80] disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                      >
                        {isSendingReply ? 'Dispatching...' : 'Send Reply'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-8 opacity-80 mt-4">
                  <p className="text-[9px] uppercase tracking-[0.4em] font-black text-white">Sent via NoNameNote System</p>
                  <Link 
                    to="/"
                    className="group text-[11px] uppercase tracking-[0.5em] font-black text-white border-b border-white/20 pb-1 hover:border-white transition-all flex items-center gap-3"
                  >
                    Send your own note
                    <span className="group-hover:translate-x-2 transition-transform">→</span>
                  </Link>
                </div>
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
          top: 1rem !important;
          right: 1rem !important;
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
      `}} />
    </div>
  );
}
