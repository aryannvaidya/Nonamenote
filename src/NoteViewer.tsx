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
  
  const [animationStage, setAnimationStage] = useState<'idle' | 'animating' | 'revealed'>('idle');

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

  const startAnimation = async () => {
    if (!viewingData || !id || animationStage !== 'idle') return;
    
    setAnimationStage('animating');
    
    // Total sequence ~4s
    // 3.5s - Background should start fading in
    // 4.0s - Note content should appear
    setTimeout(() => {
      setAnimationStage('revealed');
    }, 3500);

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
            transition={{ duration: 1.0 }}
            className={`fixed inset-0 w-full h-full z-0 transition-colors duration-1000 ${isThemeBgClass ? viewingData.theme_bg : ''}`}
            style={!isThemeBgClass ? { backgroundColor: viewingData?.theme_bg || '#000' } : {}}
          />
        )}
      </AnimatePresence>

      <div className="relative w-full h-full flex items-center justify-center">
        {animationStage !== 'revealed' && (
          <div className="viewer-overlay" onClick={animationStage === 'idle' ? startAnimation : undefined}>
            <div className={`envelope ${animationStage === 'animating' ? 'envelope-fade-out' : ''}`}>
              <div className="envelope-back-flap" />
              <div className="envelope-letter" />
              <div className="envelope-front-left" />
              <div className="envelope-front-right" />
              <div className="wax-seal">N</div>
              
              {animationStage === 'idle' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 cursor-pointer group transition-colors hover:bg-black/20">
                   <p className="text-[10px] tracking-[0.5em] text-[#d4a843] uppercase font-black animate-pulse">View Message</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revealed Note Content */}
        <AnimatePresence>
          {animationStage === 'revealed' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
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
                      .replace(/id="note-card"/g, '') 
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
