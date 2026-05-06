import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';

export default function NoteViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewingData, setViewingData] = useState<any>(null);
  const [isNoteLoading, setIsNoteLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'error' | null; message: string }>({ type: null, message: '' });
  const [animationStage, setAnimationStage] = useState<'idle' | 'animating' | 'revealed'>('idle');
  const [showReplyPanel, setShowReplyPanel] = useState(false);
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

  const fetchNote = async (noteId: string) => {
    setIsNoteLoading(true);
    try {
      const response = await fetch('/api/get-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, markSeen: false })
      });
      if (!response.ok) {
        setStatus({ type: 'error', message: "This note has expired or doesn't exist" });
      } else {
        const { note } = await response.json();
        setViewingData(note);
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: "Error fetching note" });
    } finally {
      setIsNoteLoading(false);
    }
  };

  const startAnimation = async () => {
    if (!viewingData || !id || animationStage !== 'idle') return;
    
    setAnimationStage('animating');
    
    // Mark as seen in background
    fetch('/api/get-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId: id, markSeen: true })
    }).catch(e => console.warn("Background mark seen failed:", e));

    // Wait for the simple "reveal" 
    setTimeout(() => {
      setAnimationStage('revealed');
    }, 800);
  };

  const submitReply = async () => {
    try {
      if (!replyText?.trim() || isSendingReply || hasReplied || !id) return;
      
      setIsSendingReply(true);
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
      setShowReplyPanel(false);
    } catch (e) {
      console.error("Failed to send reply", e);
    } finally {
      setIsSendingReply(false);
    }
  };

  if (isNoteLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#d4a843] font-mono tracking-widest text-sm animate-pulse uppercase">
          Initializing Connection...
        </div>
      </div>
    );
  }

  if (status.type === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-[#d4a843] text-4xl mb-6">⚠️</div>
        <div className="text-white/60 font-mono text-sm tracking-widest mb-8 uppercase max-w-xs">{status.message}</div>
        <Link to="/" className="text-[#d4a843] font-mono text-[10px] uppercase tracking-[0.5em] border border-[#d4a843]/30 px-6 py-3 hover:bg-[#d4a843]/10 transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  // Date formatting with robust fallback
  const dateStr = (function() {
    try {
      const rawTs = viewingData?.timestamp || viewingData?.createdAt;
      if (!rawTs) return null;
      
      // If it's a string (ISO), number, or Date object
      const dateObj = new Date(rawTs);
      if (isNaN(dateObj.getTime())) return null;

      return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).toUpperCase();
    } catch(e) {
      console.error("Date formatting error:", e);
      return null;
    }
  })();

  const themeBg = viewingData?.theme_bg || '#000000';
  const isThemeBgClass = themeBg.startsWith('bg-');

  return (
    <div className={`min-h-screen relative overflow-x-hidden ${animationStage === 'revealed' ? (isThemeBgClass ? themeBg : '') : 'bg-[#0a0a0a]'}`} style={!isThemeBgClass && animationStage === 'revealed' ? { backgroundColor: themeBg } : {}}>
      
      {/* Recipient View Main Container */}
      <AnimatePresence mode="wait">
        {animationStage !== 'revealed' ? (
          <motion.div 
            key="envelope-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
            className="fixed inset-0 flex flex-col items-center justify-center p-6"
            onClick={startAnimation}
          >
            {/* Top Navigation */}
            <div className="absolute top-8 left-8 right-8 flex items-center justify-between pointer-events-auto">
              <button onClick={() => navigate('/')} className="text-white/40 hover:text-white transition-colors">
                <ArrowLeft size={24} />
              </button>
              <div className="text-white/20 font-mono text-[10px] tracking-[0.6em] uppercase translate-x-[12px]">Encrypted</div>
              <div className="w-6" /> {/* Spacer */}
            </div>

            {/* Envelope Illustration */}
            <div className="relative w-full max-w-[340px] aspect-[4/3] group cursor-pointer">
              {/* Envelope Body */}
              <div className="absolute inset-0 bg-[#1c1c1c] rounded-2xl border border-white/5 shadow-2xl overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #d4a843 0%, transparent 100%)', filter: 'blur(40px)' }} />
                {/* Envelope fold lines (using clip-path) */}
                <div className="absolute inset-0 bg-white/5" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)' }} />
                <div className="absolute inset-0 bg-white/[0.02]" style={{ clipPath: 'polygon(0 0, 0 100%, 50% 50%)' }} />
                <div className="absolute inset-0 bg-white/[0.02]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)' }} />
                
                {/* Wax Seal */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-[#d4a843] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-10 transition-transform group-hover:scale-110">
                  <span className="text-[#1c1c1c] font-serif text-3xl font-medium">N</span>
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className="mt-16 text-center w-full max-w-full overflow-hidden">
              <h1 className="text-white font-serif text-2xl sm:text-3xl md:text-5xl tracking-[0.1em] sm:tracking-[0.4em] uppercase leading-tight md:leading-relaxed mb-4 px-4 break-words">
                Private<br />Transmission
              </h1>
              <p className="text-[#d4a843]/60 font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">
                Tap to reveal the message
              </p>
            </div>

            {/* Footer Labels */}
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-[1px] w-12 bg-white/10" />
                <div className="text-white/30 font-mono text-[9px] tracking-[0.3em] uppercase">Nonamenote Archive</div>
                <div className="h-[1px] w-12 bg-white/10" />
              </div>
              <p className="text-white/10 text-[8px] uppercase tracking-[0.2em] max-w-[240px] text-center leading-relaxed">
                Identity protected via end-to-end zero-knowledge protocol
              </p>
            </div>
          </motion.div>
        ) : (
          <div key="revealed-view" className="w-full flex flex-col items-center px-4 py-8 md:py-12 box-border min-h-screen overflow-hidden">
              {/* Header outside the paper */}
            <div className="w-full max-w-4xl flex justify-end mb-2 pr-2">
               <span className="font-mono text-[10px] md:text-sm tracking-[0.2em] uppercase text-white/40">
                  DATE: {dateStr || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
                </span>
            </div>

            {/* Note Content Area (No paper background) */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative w-full max-w-4xl flex flex-col box-border min-h-[400px]"
            >
              {/* Stamp (if present in the data) */}
              <div 
                id="viewer-stamp-container" 
                className="absolute top-0 right-0 pointer-events-none opacity-60 z-20"
                dangerouslySetInnerHTML={{ __html: viewingData?.stampHTML || '' }}
              />

              {/* Note Content - Touching boundaries as requested */}
              <div 
                className="flex-1 w-full overflow-hidden py-4 selection:bg-[#d4a843]/30"
                style={{ 
                  fontFamily: viewingData?.font_family || 'serif',
                }}
              >
                <div 
                   className="note-content-rendered px-0 w-full text-white"
                   dangerouslySetInnerHTML={{ 
                     __html: (viewingData?.noteHTML || "")
                       .replace(/contenteditable="true"/g, 'contenteditable="false"')
                       .replace(/<a\b[^>]*>(.*?)<\/a>/gi, '<span class="disabled-link">$1</span>')
                       .replace(/Dispatch No\.[^]*?\d{2}-\d{3}-[A-Z]/gi, '')
                       .replace(/Date:[^]*?\d{2}\s[A-Z][a-z]+\s\d{4}/gi, '')
                   }}
                />
              </div>

              {/* Security Warning */}
              <div className="flex items-center gap-3 px-4 py-4 bg-white/5 border border-white/10 rounded-xl mb-8">
                <ShieldCheck size={18} className="text-[#d4a843] shrink-0" />
                <p className="text-[10px] sm:text-[11px] font-medium leading-relaxed text-white/50 tracking-wide">
                  <span className="text-[#d4a843] font-bold uppercase mr-1">Security Notice:</span>
                  External links are deactivated for your protection. Opening untrusted web addresses from anonymous sources is a security risk.
                </p>
              </div>

              {/* Unified Footer Actions - Stacked closely as requested */}
              <div className="pb-16 pt-8 border-t border-white/10 flex flex-col items-center gap-6">
                <button 
                  onClick={() => setShowReplyPanel(true)}
                  className="group flex items-center gap-3 text-sm font-medium tracking-[0.3em] uppercase border-b-2 border-[#d4a843] pb-1 hover:opacity-80 transition-all font-mono text-[#d4a843]"
                  style={{ borderColor: '#d4a843' }}
                >
                  Respond anonymously <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                    onClick={() => navigate('/')}
                    className="text-[12px] font-bold tracking-[0.4em] uppercase font-mono text-white hover:text-black hover:bg-white border border-white/20 px-8 py-4 rounded-full transition-all"
                >
                    SEND YOUR OWN NOTES ANONYMOUS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reply Modal/Panel */}
      <AnimatePresence>
        {showReplyPanel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0f0f0f] rounded-2xl border border-white/5 p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <h2 className="text-white font-mono text-xs tracking-[0.4em] uppercase">Anonymous Reply</h2>
                <button onClick={() => setShowReplyPanel(false)} className="text-white/40 hover:text-white">&times;</button>
              </div>
              
              <div className="relative mb-6 group bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden focus-within:border-[#d4a843]/40 transition-colors flex flex-col">
                <textarea
                  autoFocus
                  rows={5}
                  value={replyText}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 1000) {
                      setReplyText(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Prevent typing more characters if at limit, except for backspace/delete
                    if (replyText.length >= 1000 && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full bg-transparent p-6 text-white font-serif text-lg resize-none focus:outline-none placeholder:text-white/10 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 flex-1"
                  placeholder="Type your response..."
                />
                <div className="h-12 px-6 border-t border-white/5 flex items-center bg-black/20">
                  <span className={`text-[9px] font-mono tracking-widest uppercase transition-colors ${replyText.length >= 1000 ? 'text-[#ef4444]' : 'text-white/20 group-focus-within:text-[#d4a843]/40'}`}>
                    {replyText.length} / 1000
                  </span>
                </div>
              </div>
              
              <button 
                disabled={!replyText.trim() || isSendingReply}
                onClick={submitReply}
                className="w-full py-5 bg-[#d4a843] text-black text-[11px] tracking-[0.4em] font-black uppercase rounded-xl hover:bg-white transition-all disabled:opacity-20 active:scale-[0.98] shadow-xl"
              >
                {isSendingReply ? 'Sending...' : 'Dispatch Reply'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .note-content-rendered {
          font-size: 1.5rem;
          line-height: 1.7; /* Slightly more breathable for parchment */
        }
        @media (max-width: 768px) {
          .note-content-rendered {
            font-size: 1.25rem;
          }
        }
        /* Hide internal headers, character counts, and metadata blocks that might be in the noteHTML */
        .note-content-rendered .dispatch-header,
        .note-content-rendered .header-box,
        .note-content-rendered .char-count,
        .note-content-rendered [style*="border-width: 2px"],
        .note-content-rendered [style*="border: 2px"] {
           display: none !important;
        }
        
        .note-content-rendered .disabled-link {
           text-decoration: underline;
           text-decoration-style: dotted;
           cursor: not-allowed;
           opacity: 0.7;
           color: #d4a843;
        }
        
        /* Ensure the stamp (img) is visible and positioned if it came from the HTML */
        .note-content-rendered img {
           display: block !important;
           max-width: 80px;
           height: auto;
           opacity: 0.6;
        }

        .note-content-rendered blockquote {
          border-left: 3px solid #d4a843;
          padding-left: 1.5rem;
          margin: 2rem 0;
          font-style: italic;
          opacity: 0.9;
        }
        .note-content-rendered h2 {
           font-size: 2em;
           margin-bottom: 0.75em;
           margin-top: 1.5em;
           font-weight: 600;
           line-height: 1.2;
        }
        .note-content-rendered p {
          margin-bottom: 1.25em;
        }
        .note-content-rendered mark {
          background-color: #d4a843;
          color: black;
          padding: 0 4px;
        }
      `}} />
    </div>
  );
}
