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
            className={`relative w-[320px] md:w-[450px] aspect-[1.5/1] transition-all duration-500 pointer-events-auto
              ${animationStage === 'fading' ? 'opacity-0 scale-105 blur-sm' : 'opacity-100 scale-100'}
            `}
            style={{ transitionTimingFunction: 'ease-in-out', transitionDuration: '600ms' }}
          >
            {/* Envelope Frame */}
            <div 
              onClick={handleOpenEnvelope}
              className={`absolute inset-0 bg-[#4e342e] shadow-2xl z-20 cursor-pointer overflow-visible
                ${animationStage !== 'idle' ? 'cursor-default pointer-events-none' : 'hover:scale-105 active:scale-95 transition-transform'}
              `}
            >
              {/* Flap (Top) */}
              <div 
                className="absolute top-0 left-0 w-full h-1/2 bg-[#5d4037] origin-top border-b border-black/10 z-40 transition-transform duration-[1500ms] ease-in-out"
                style={{ 
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                  transform: (animationStage !== 'idle') ? 'rotateX(180deg)' : 'rotateX(0deg)',
                  zIndex: (animationStage !== 'idle') ? 0 : 40
                }}
              />

              {/* Card (Inside) */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 top-4 w-[90%] h-[90%] bg-white shadow-inner flex flex-col p-4 z-10 transition-transform duration-[1000ms] ease-out"
                style={{
                  transform: (animationStage === 'sliding' || animationStage === 'fading') 
                    ? 'translate(-50%, -120px)' 
                    : 'translate(-50%, 0)'
                }}
              >
                <div className="w-full h-3 bg-gray-100 mb-3" />
                <div className="w-full h-1 bg-gray-50 mb-1" />
                <div className="w-[80%] h-1 bg-gray-50 mb-1" />
                <div className="w-[90%] h-1 bg-gray-50" />
              </div>

              {/* Front Shadow/Body V */}
              <div 
                className="absolute inset-0 bg-[#4e342e] z-30"
                style={{ clipPath: 'polygon(0 0, 50% 50%, 100% 0, 100% 100%, 0 100%)' }}
              />

              {/* Click instruction */}
              {animationStage === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-50">
                  <Mail size={40} className="text-[#a1887f] opacity-50" />
                  <p className="text-[10px] tracking-[0.4em] text-[#a1887f] uppercase font-bold animate-pulse">Touch to reveal</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revealed Note Content */}
        <AnimatePresence>
          {animationStage === 'revealed' && (
            <motion.div 
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative z-10 w-full max-w-[560px] mx-6 pointer-events-auto"
            >
              <div 
                className="w-full p-10 md:p-14 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col items-start text-left"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: viewingData?.text_color || '#fff',
                  fontFamily: viewingData?.font_family
                }}
              >
                <div className="w-full text-center mb-12 border-b border-current opacity-10 pb-8">
                  <p className="text-[10px] uppercase tracking-[0.4em] font-black">— A Note For You —</p>
                </div>

                <div 
                  className="w-full text-xl md:text-2xl leading-relaxed whitespace-pre-wrap message-content"
                  dangerouslySetInnerHTML={{ __html: viewingData?.message || "" }}
                />

                <div className="w-full mt-14 pt-10 border-t border-current opacity-10 flex flex-col items-center gap-6">
                  <p className="text-[9px] uppercase tracking-[0.3em] font-bold opacity-40">Sent anonymously via NoNameNote</p>
                  
                  <Link 
                    to="/"
                    className="text-[10px] uppercase tracking-[0.4em] font-medium opacity-30 hover:opacity-100 transition-opacity flex items-center gap-2"
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
        .message-content * {
          text-align: inherit !important;
          color: inherit !important;
        }
        .message-content blockquote {
          background: rgba(0,0,0,0.05);
          margin-left: 0;
          margin-right: 0;
        }
      `}} />
    </div>
  );
}
