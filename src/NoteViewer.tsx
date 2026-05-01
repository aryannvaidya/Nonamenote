import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Volume2, VolumeX } from 'lucide-react';
import { db } from './firebase';

export default function NoteViewer() {
  const { id } = useParams<{ id: string }>();
  const [viewingData, setViewingData] = useState<any>(null);
  const [isNoteLoading, setIsNoteLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'error' | null; message: string }>({ type: null, message: '' });
  
  const [envelopeOpened, setEnvelopeOpened] = useState(false);
  const [isCardSliding, setIsCardSliding] = useState(false);
  const [isEnvelopeFading, setIsEnvelopeFading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const openSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    openSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
  }, []);

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
    if (!viewingData || !id) return;
    setEnvelopeOpened(true);
    
    if (!isMuted && openSoundRef.current) {
      openSoundRef.current.play().catch(e => console.error("Audio playback failed", e));
    }

    // Animation sequence
    // 0s: Flap starts opening (1.5s)
    // 1.5s: Card starts sliding up (1s)
    // 2.5s: Envelope starts fading away (0.5s)
    // 3.0s: Show full note
    
    setTimeout(() => {
      setIsCardSliding(true);
    }, 1500);

    setTimeout(() => {
      setIsEnvelopeFading(true);
    }, 2500);

    try {
      await db.collection('notes').doc(id).update({ opened: true });
    } catch (e) {
      console.error("Failed to update opened state", e);
    }
  };

  if (isNoteLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[#b89e7a] rounded-full animate-spin" />
      </div>
    );
  }

  if (status.type === 'error') {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-8 text-8xl">✉️</div>
        <h2 className="font-sans text-white text-2xl md:text-3xl mb-8 tracking-tight font-light">
          {status.message}
        </h2>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-8 py-4 bg-[#b89e7a] text-black font-bold uppercase tracking-[0.2em] text-xs hover:bg-[#c9bda4] transition-all"
        >
          Send your own note →
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-1000 ${viewingData?.theme_bg?.startsWith('bg-') ? viewingData.theme_bg : ''}`}
      style={!viewingData?.theme_bg?.startsWith('bg-') ? { backgroundColor: viewingData?.theme_bg || '#000' } : {}}
    >
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="fixed top-6 right-6 z-[100] p-3 rounded-full bg-black/20 hover:bg-black/40 transition-colors text-white/50 hover:text-white"
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      <div className="relative w-full max-w-2xl min-h-[500px] flex items-center justify-center">
        {!isEnvelopeFading ? (
          <div 
            onClick={!envelopeOpened ? handleOpenEnvelope : undefined}
            className={`w-full max-w-md aspect-[3/2] bg-[#8B4513] relative group shadow-2xl transition-all duration-500 z-50 overflow-visible ${!envelopeOpened ? 'cursor-pointer hover:scale-105' : ''}`}
          >
            <div 
              className={`absolute top-0 left-0 w-full h-1/2 bg-[#A0522D] origin-top border-b border-black/10 z-40`} 
              style={{ 
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                animation: envelopeOpened ? 'envelope-open-top 1.5s forwards ease-in-out' : 'none'
              }} 
            />
            
            <div 
              className={`absolute inset-x-8 top-4 bottom-4 bg-white shadow-lg p-6 z-10`}
              style={{
                animation: isCardSliding ? 'card-slide-up 1s forwards ease-out' : 'none'
              }}
            >
                <div className="w-full h-4 bg-gray-100 mb-4" />
                <div className="w-[80%] h-2 bg-gray-50 mb-2" />
                <div className="w-[90%] h-2 bg-gray-50 mb-2" />
                <div className="w-[70%] h-2 bg-gray-50" />
            </div>

            <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[180px] md:border-l-[224px] border-l-transparent border-r-[180px] md:border-r-[224px] border-r-transparent border-b-[120px] md:border-b-[150px] border-b-[#A0522D] z-30 pointer-events-none" />
            
            {!envelopeOpened && (
               <div className="absolute inset-0 bg-[#8B4513] flex flex-col items-center justify-center gap-4 z-10">
                  <Mail size={48} className="text-[#f4e4c1]" />
                  <p className="font-serif-elegant tracking-[0.2em] text-[#f4e4c1] text-xs uppercase animate-pulse">Click to open</p>
               </div>
            )}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className={`w-full max-w-[600px] p-10 md:p-14 relative flex flex-col shadow-2xl rounded-[16px]`}
            style={{
              backgroundColor: 'white',
              color: viewingData?.text_color,
              fontFamily: viewingData?.font_family
            }}
          >
             <div className="text-center mb-10 border-b border-black/5 pb-6">
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 font-bold">— A Note For You —</p>
             </div>

              <div 
                className="flex-1 text-xl md:text-2xl leading-relaxed break-words text-center"
                dangerouslySetInnerHTML={{ __html: viewingData?.message || "" }}
              />

              <div className="mt-14 flex flex-col items-center gap-4 border-t border-black/5 pt-10">
                <p className="text-[11px] uppercase tracking-[0.2em] opacity-40">Sent anonymously via NoNameNote</p>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="mt-4 text-[10px] uppercase tracking-[0.3em] opacity-30 hover:opacity-100 transition-opacity"
                >
                  Send your own note
                </button>
              </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
