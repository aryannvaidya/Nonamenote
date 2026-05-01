import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail } from 'lucide-react';
import { db } from './firebase';

export default function NoteViewer() {
  const { id } = useParams<{ id: string }>();
  const [viewingData, setViewingData] = useState<any>(null);
  const [isNoteLoading, setIsNoteLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'error' | null; message: string }>({ type: null, message: '' });
  
  const [animationStage, setAnimationStage] = useState<'idle' | 'opening' | 'sliding' | 'fading' | 'revealed'>('idle');

  useEffect(() => {
    if (id) {
      fetchNote(id);
    }
  }, [id]);

  const fetchNote = async (noteId: string) => {
    setIsNoteLoading(true);
    try {
      const doc = await db.collection('notes').doc(noteId).get();
      if (!doc.exists) {
        setStatus({ type: 'error', message: "This note has expired or doesn't exist" });
      } else {
        const data = doc.data();
        setViewingData(data);
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: "Error fetching note" });
    } finally {
      setIsNoteLoading(false);
    }
  };

  const handleOpenEnvelope = async () => {
    if (!viewingData || !id || animationStage !== 'idle') return;
    
    setAnimationStage('opening');
    
    // Sequence (Total ~3.6s)
    // 1. Move to sliding after flap opens (1.5s)
    setTimeout(() => {
      setAnimationStage('sliding');
      // 2. Move to fading after card slides (1s)
      setTimeout(() => {
        setAnimationStage('fading');
        // 3. Move to revealed after envelope fades (0.6s)
        setTimeout(() => {
          setAnimationStage('revealed');
        }, 600);
      }, 1000);
    }, 1500);

    try {
      await db.collection('notes').doc(id).update({ opened: true });
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

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black selection:bg-white/20">
      {/* Background Transition */}
      <AnimatePresence>
        {animationStage === 'revealed' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`fixed inset-0 w-full h-full z-0 transition-colors duration-1000 ${isThemeBgClass ? viewingData.theme_bg : ''}`}
            style={!isThemeBgClass ? { backgroundColor: viewingData?.theme_bg || '#000' } : {}}
          />
        )}
      </AnimatePresence>

      <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
        {animationStage !== 'revealed' && (
          <div 
            className={`relative w-[340px] md:w-[480px] aspect-[1.5/1] transition-all duration-700 pointer-events-auto
              ${animationStage === 'fading' ? 'opacity-0 scale-110 blur-md translate-y-[-20px]' : 'opacity-100 scale-100'}
            `}
            style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {/* Envelope Frame - Realistic Paper Texture and Depth */}
            <div 
              onClick={handleOpenEnvelope}
              className={`absolute inset-0 bg-[#3e2723] rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 cursor-pointer overflow-visible
                ${animationStage !== 'idle' ? 'cursor-default pointer-events-none' : 'hover:scale-105 active:scale-95 transition-transform duration-300'}
              `}
              style={{
                backgroundImage: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, transparent 100%)',
                boxShadow: animationStage === 'idle' 
                  ? '0 20px 50px rgba(0,0,0,0.5), inset 0 0 100px rgba(0,0,0,0.2)' 
                  : '0 5px 15px rgba(0,0,0,0.3)'
              }}
            >
              {/* Flap (Top) - Improved color and shadow */}
              <div 
                className="absolute top-0 left-0 w-full h-1/2 bg-[#4e342e] origin-top z-40 transition-transform duration-[1500ms] ease-in-out"
                style={{ 
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                  transform: (animationStage !== 'idle') ? 'rotateX(180deg)' : 'rotateX(0deg)',
                  zIndex: (animationStage !== 'idle') ? 0 : 45,
                  boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.2)'
                }}
              >
                {/* Wax Seal / Decorative Element */}
                {animationStage === 'idle' && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-[#b89e7a] rounded-full shadow-lg z-50 flex items-center justify-center border-2 border-[#8d6e63]/20">
                    <div className="w-6 h-6 border border-white/20 rounded-full flex items-center justify-center">
                       <span className="text-[10px] text-white/40 font-serif">N</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card (Inside) - More realistic card feel */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 top-4 w-[92%] h-[92%] bg-[#fafafa] shadow-lg flex flex-col p-6 z-10 transition-transform duration-[1200ms] cubic-bezier(0.34, 1.56, 0.64, 1)"
                style={{
                  transform: (animationStage === 'sliding' || animationStage === 'fading') 
                    ? 'translate(-50%, -140px)' 
                    : 'translate(-50%, 0)',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}
              >
                <div className="w-full h-4 bg-gray-100/80 mb-4 rounded-sm" />
                <div className="w-[85%] h-1.5 bg-gray-50 mb-2 rounded-full" />
                <div className="w-[95%] h-1.5 bg-gray-50 mb-2 rounded-full" />
                <div className="w-[75%] h-1.5 bg-gray-50 rounded-full" />
                <div className="mt-auto flex justify-end">
                   <div className="w-10 h-10 rounded-full border-2 border-gray-100 flex items-center justify-center">
                      <div className="w-6 h-6 border dash-border border-gray-100 rounded-full" />
                   </div>
                </div>
              </div>

              {/* Front Body - Side triangles for realistic envelope fold */}
              <div 
                className="absolute inset-0 bg-[#3e2723] z-30"
                style={{ 
                  clipPath: 'polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%)',
                  backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.2), transparent)' 
                }}
              />

              {/* Inner Shadow for opening */}
              <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />

              {/* Click instruction */}
              {animationStage === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-50 pointer-events-none">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform">
                    <Mail size={32} className="text-[#b89e7a]/60" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] tracking-[0.5em] text-[#b89e7a] uppercase font-black">Private Message</p>
                    <p className="text-[8px] tracking-[0.2em] text-white/30 uppercase">Tab to reveal transmission</p>
                  </div>
                </div>
              )}
            </div>
            {/* Ground Shadow */}
            {animationStage === 'idle' && (
               <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-black/40 blur-xl rounded-full scale-x-110" />
            )}
          </div>
        )}

        {/* Revealed Note Content */}
        <AnimatePresence>
          {animationStage === 'revealed' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="fixed inset-0 z-10 w-full h-full flex items-center justify-center pointer-events-auto p-4 overflow-hidden"
              id="viewer-container"
            >
              <div className="flex flex-col items-center gap-6 w-full max-w-4xl transition-transform duration-500 origin-center" style={{ transform: 'scale(var(--note-scale, 1))' }}>
                <div className="w-full text-center opacity-40">
                  <p className="text-[10px] uppercase tracking-[0.4em] font-black">— A Note For You —</p>
                </div>

                <div 
                  className="w-full max-w-[600px] pointer-events-none shadow-2xl rounded-sm overflow-hidden"
                  dangerouslySetInnerHTML={{ 
                    __html: (viewingData?.noteHTML || "")
                      .replace(/contenteditable="true"/g, 'contenteditable="false"')
                      .replace(/id="note-card"/g, '') // remove id to avoid duplicates if necessary
                  }}
                />

                <div className="flex flex-col items-center gap-4 opacity-40">
                  <p className="text-[8px] uppercase tracking-[0.3em] font-bold">Sent anonymously via NoNameNote</p>
                  <Link 
                    to="/"
                    className="text-[10px] uppercase tracking-[0.3em] font-medium hover:opacity-100 transition-opacity flex items-center gap-2"
                  >
                    Send your own note →
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
          :root {
            --note-scale: 0.85;
          }
        }
        @media (max-width: 480px) {
          :root {
            --note-scale: 0.7;
          }
        }
        @media (max-width: 380px) {
          :root {
            --note-scale: 0.6;
          }
        }
        #viewer-container [contenteditable] {
          outline: none !important;
          cursor: default !important;
        }
        #viewer-container .highlighter {
          border-radius: 2px;
        }
      `}} />
    </div>
  );
}
