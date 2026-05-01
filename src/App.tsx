import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bold, Italic, Underline, Palette, AlignLeft, AlignCenter, AlignRight, 
  Moon, Sun,
  Send, Link as LinkIcon, Mail, CheckCircle2, AlertCircle, Clock,
  ChevronLeft, ChevronRight, TextQuote, Type, Heading1, Heading2, Heading, Baseline,
  Highlighter, Quote, Volume2, VolumeX
} from 'lucide-react';
import confetti from 'canvas-confetti';
import emailjs from '@emailjs/browser';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// --- Constants & Types ---
const firebaseConfig = {
  apiKey: "AIzaSyCzAUcI8BHIqF88e5z2pNwcd6QqKPUjfR4",
  authDomain: "nonamenote-77feb.firebaseapp.com",
  projectId: "nonamenote-77feb",
  storageBucket: "nonamenote-77feb.firebasestorage.app",
  messagingSenderId: "404747791885",
  appId: "1:404747791885:web:2a41e8ca8c49ff13c1af44"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const CHAR_LIMIT = 500;

interface Theme {
  id: string;
  name: string;
  bgClass: string;
  paperClass: string;
  fontClass: string;
  accentColor: string;
  description: string;
}

const THEMES: Theme[] = [
  { 
    id: 'telegraph', 
    name: 'Telegraph', 
    bgClass: 'bg-[#0d0d0d]', 
    paperClass: 'bg-[#fdf5e6] shadow-2xl border-4 border-[#b89e7a]', 
    fontClass: 'font-telegraph text-[#2F2F2F]',
    accentColor: '#b89e7a',
    description: 'Morse & stamp'
  },
  { 
    id: 'white', 
    name: 'Plain White', 
    bgClass: 'bg-[#0d0d0d]', 
    paperClass: 'bg-white shadow-2xl border border-gray-100', 
    fontClass: 'font-serif-elegant text-gray-800',
    accentColor: '#b89e7a',
    description: 'Minimal'
  },
  { 
    id: 'black', 
    name: 'Plain Black', 
    bgClass: 'bg-[#0d0d0d]', 
    paperClass: 'bg-[#111] shadow-2xl border border-white/5 [background-image:url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.05\'/%3E%3C/svg%3E")]', 
    fontClass: 'font-sans text-gray-100',
    accentColor: '#b89e7a',
    description: 'Noise'
  },
  { 
    id: 'valentine', 
    name: 'Valentine', 
    bgClass: 'bg-[#300a0a]', 
    paperClass: 'bg-[#fff5f5] shadow-2xl border-t-[16px] border-pink-200 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100%25\' height=\'100%25\'%3E%3Ctext x=\'10\' y=\'30\' font-size=\'30\' opacity=\'0.3\'%3E💖%3C/text%3E%3Ctext x=\'85%25\' y=\'15%25\' font-size=\'20\' opacity=\'0.2\'%3E💘%3C/text%3E%3Ctext x=\'15%25\' y=\'85%25\' font-size=\'25\' opacity=\'0.2\'%3E💝%3C/text%3E%3Ctext x=\'90%25\' y=\'90%25\' font-size=\'30\' opacity=\'0.3\'%3E💌%3C/text%3E%3Ccircle cx=\'50%25\' cy=\'50%25\' r=\'150\' fill=\'none\' stroke=\'%23f472b6\' stroke-width=\'0.5\' stroke-dasharray=\'10 20\' opacity=\'0.1\'/%3E%3C/svg%3E")]', 
    fontClass: 'font-serif-elegant text-[#9b2c2c]',
    accentColor: '#f472b6',
    description: 'Hearts & Pink'
  },
  { 
    id: 'holi', 
    name: 'GRADIENT', 
    bgClass: 'bg-[#0d0d0d]', 
    paperClass: 'bg-white shadow-2xl [background-image:radial-gradient(circle_at_0%_0%,_rgba(255,0,150,0.15)_0%,_transparent_40%),_radial-gradient(circle_at_100%_0%,_rgba(0,200,255,0.15)_0%,_transparent_40%),_radial-gradient(circle_at_50%_100%,_rgba(255,200,0,0.15)_0%,_transparent_40%)]', 
    fontClass: 'font-sans text-gray-700 font-bold',
    accentColor: '#ed64a6',
    description: 'Vibrant'
  },
  { 
    id: 'forest', 
    name: 'Forest', 
    bgClass: 'bg-[#051a10]', 
    paperClass: 'bg-white shadow-2xl border-l-[16px] border-green-950 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100%25\' height=\'100%25\'%3E%3Ctext x=\'5\' y=\'15\' font-size=\'15\' opacity=\'0.1\'%3E🍃%3C/text%3E%3Ctext x=\'95%25\' y=\'95%25\' font-size=\'15\' opacity=\'0.1\' text-anchor=\'end\'%3E🍄%3C/text%3E%3Cpath d=\'M0 0 Q20 50 0 100\' fill=\'none\' stroke=\'%231a3d2e\' stroke-width=\'4\' opacity=\'0.05\'/%3E%3C/svg%3E")]', 
    fontClass: 'font-serif-elegant text-[#1c4532]',
    accentColor: '#276749',
    description: 'Nature'
  },
  { 
    id: 'ocean', 
    name: 'Ocean', 
    bgClass: 'bg-[#1a365d]', 
    paperClass: 'bg-white shadow-2xl border-b-[24px] border-blue-950 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100%25\' height=\'100%25\'%3E%3Cpath d=\'M0 90 Q25 80 50 90 T100 90\' fill=\'none\' stroke=\'%231a365d\' opacity=\'0.08\'/%3E%3Ctext x=\'10\' y=\'95%25\' font-size=\'15\' opacity=\'0.2\'%3E🐚%3C/text%3E%3Ccircle cx=\'80%25\' cy=\'70%25\' r=\'2\' fill=\'%231a365d\' opacity=\'0.05\'/%3E%3C/svg%3E")]', 
    fontClass: 'font-serif-elegant text-[#1a365d]',
    accentColor: '#319795',
    description: 'Waves'
  },
  { 
    id: 'terminal', 
    name: 'Terminal', 
    bgClass: 'bg-[#0d0d0d]', 
    paperClass: 'bg-[#0d1117] border border-[#30363d] shadow-2xl rounded-none overflow-hidden before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-8 before:bg-[#161b22] before:border-b before:border-[#30363d] after:content-[">_"] after:absolute after:bottom-4 after:right-4 after:text-[#3fb950] after:animate-[cursor-blink_1s_infinite]', 
    fontClass: 'font-mono text-[#f0f6fc] caret-[#58a6ff]',
    accentColor: '#3fb950',
    description: 'Repo style'
  }
];

export default function App() {
  const [content, setContent] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>(THEMES[0]);
  const [activeTextColor, setActiveTextColor] = useState<string | null>(null);
  const [activeFormats, setActiveFormats] = useState<{ [key: string]: boolean }>({});
  const [highlighterMode, setHighlighterMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  
  // Routing for view mode
  const [viewingNoteId, setViewingNoteId] = useState<string | null>(null);
  const [viewingData, setViewingData] = useState<any>(null);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [envelopeOpened, setEnvelopeOpened] = useState(false);
  const [isCardSliding, setIsCardSliding] = useState(false);
  const [isEnvelopeFading, setIsEnvelopeFading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const openSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    openSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
  }, []);

  useEffect(() => {
    // Step 1 — Detect the URL
    const path = window.location.pathname;
    if (path.includes('/view/')) {
      const id = path.split('/view/')[1];
      if (id) {
        setViewingNoteId(id);
        fetchNote(id);
      }
    }
  }, []);

  // Step 2 — Load note from Firebase
  const fetchNote = async (id: string) => {
    setIsNoteLoading(true);
    try {
      const doc = await db.collection('notes').doc(id).get();
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
    if (!viewingData || !viewingNoteId) return;
    setEnvelopeOpened(true);
    
    if (!isMuted && openSoundRef.current) {
      openSoundRef.current.play().catch(e => console.error("Audio playback failed", e));
    }

    // Animation sequence (Updated per request):
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

    // Thing 3 - Step 5: Update Firestore after showing (or starting to show)
    try {
      await db.collection('notes').doc(viewingNoteId).update({ opened: true });
    } catch (e) {
      console.error("Failed to update opened state", e);
    }
  };

  // Selection tracking
  const updateActiveFormats = useCallback(() => {
    if (typeof document === 'undefined') return;
    
    const formats: { [key: string]: boolean } = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
    };

    const selection = window.getSelection();
    let inHighlighterContext = false;
    let inH2Context = document.queryCommandValue('formatBlock') === 'h2' || false;
    let inBlockquoteContext = document.queryCommandValue('formatBlock') === 'blockquote' || false;

    if (selection && selection.rangeCount > 0) {
      let node = selection.anchorNode;
      let tempNode = node;
      while (tempNode && tempNode !== editorRef.current) {
        if (tempNode instanceof HTMLElement) {
          const name = tempNode.nodeName.toUpperCase();
          if (name === 'H2') inH2Context = true;
          if (name === 'BLOCKQUOTE') inBlockquoteContext = true;
          if (tempNode.classList.contains('highlighter') || (tempNode.style && tempNode.style.backgroundColor !== '')) {
            inHighlighterContext = true;
          }
        }
        tempNode = tempNode.parentNode;
      }
    }

    formats.highlighter = inHighlighterContext;
    formats.h2 = inH2Context;
    formats.blockquote = inBlockquoteContext;

    setActiveFormats(formats);
    
    // Sync the mode with the context if it changed
    // If the editor is empty (just a BR or empty text), we don't automatically turn off highlighterMode 
    // to avoid "flickering" or lost state when deleting characters.
    const isEditorEmpty = !editorRef.current || editorRef.current.innerText.trim().length === 0;

    if (selection && selection.isCollapsed) {
      if (inHighlighterContext) {
        setHighlighterMode(true);
      } else {
        setHighlighterMode(false);
      }
    }
    return { ...formats, highlighter: inHighlighterContext };
  }, []); // Remove dependency on highlighterMode to avoid stale closures in listeners

  useEffect(() => {
    const handleEvents = () => updateActiveFormats();
    document.addEventListener('selectionchange', handleEvents);
    
    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('keyup', handleEvents);
      editor.addEventListener('mousedown', handleEvents);
      editor.addEventListener('focus', handleEvents);
    }

    return () => {
      document.removeEventListener('selectionchange', handleEvents);
      if (editor) {
        editor.removeEventListener('keyup', handleEvents);
        editor.removeEventListener('mousedown', handleEvents);
        editor.removeEventListener('focus', handleEvents);
      }
    };
  }, [updateActiveFormats]);

  const editorRef = useRef<HTMLDivElement>(null);
  const themeScrollRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const [showSendAnimation, setShowSendAnimation] = useState(false);
  const [isOverlayFadingOut, setIsOverlayFadingOut] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  // Send Animation Component
  const SendAnimationOverlay = () => {
    if (!buttonRect) return null;
    
    return (
      <div className={`fixed inset-0 z-[9999] pointer-events-none overflow-hidden transition-opacity duration-500 ${isOverlayFadingOut ? 'opacity-0' : 'opacity-1'}`}>
        {/* Step 1: Morphing Button */}
        <div 
          className="absolute transition-all ease-in-out"
          style={{
            top: `${buttonRect.top}px`,
            left: `${buttonRect.left}px`,
            width: `${buttonRect.width}px`,
            height: `${buttonRect.height}px`,
            backgroundColor: '#b89e7a',
            animation: 'morph-to-circle 0.6s forwards ease-in-out',
            '--initial-width': `${buttonRect.width}px`,
            '--initial-height': `${buttonRect.height}px`
          } as any}
        >
          {/* Step 2: Paper Plane and Pulse */}
          <div className="absolute top-1/2 left-1/2 w-full h-full">
             {/* Pulse circle */}
             <div 
              className="absolute top-1/2 left-1/2 w-4 h-4 bg-white/30 rounded-full"
              style={{ animation: 'circle-pulse 0.4s forwards', animationDelay: '0.8s' }}
             />
             
             {/* Paper Plane SVG with bobbing */}
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white"
                style={{ 
                  animation: 'plane-pop 0.3s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275), plane-launch 1.4s forwards cubic-bezier(0.4, 0, 0.2, 1)', 
                  animationDelay: '0.6s, 1s' 
                }}
              >
                <div style={{ animation: 'plane-bob 0.5s infinite ease-in-out', animationDelay: '1s' }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </div>
                
                {/* Trail dots */}
                <div className="absolute top-1/2 left-0 flex gap-2 -translate-x-full">
                   {[...Array(5)].map((_, i) => (
                     <div 
                       key={i} 
                       className="w-1 h-1 bg-white/40 rounded-full" 
                       style={{ 
                         opacity: 0, 
                         animation: 'letter-fade-in 0.2s forwards', 
                         animationDelay: `${1.1 + (i * 0.1)}s` 
                       }} 
                     />
                   ))}
                </div>
               </div>
           </div>
         </div>

         {/* Speed lines near exit */}
         <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i}
                className="absolute bg-white/40 h-1 rounded-full"
                style={{
                  top: `${20 + i * 15}%`,
                  right: '0',
                  animation: 'speed-line 0.4s forwards',
                  animationDelay: '2.2s',
                  opacity: 0
                }}
              />
            ))}
         </div>

         {/* Step 5: Delivery Screen */}
        <div 
          className="absolute inset-0 bg-[#1a3a6b] flex flex-col items-center justify-center pointer-events-auto"
          style={{ 
            opacity: 0,
            animation: 'letter-fade-in 0.5s forwards',
            animationDelay: '2.4s'
          }}
        >
          <div className="flex flex-col items-center gap-8">
            <div style={{ animation: 'plane-pop 0.5s forwards', animationDelay: '2.8s', opacity: 0 }}>
              <Mail size={80} className="text-white" />
              {/* Confetti particles */}
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute top-1/2 left-1/2 w-2 h-2 bg-white"
                  style={{
                    '--tx': `${Math.cos(i * 30 * Math.PI / 180) * 150}px`,
                    '--ty': `${Math.sin(i * 30 * Math.PI / 180) * 150}px`,
                    '--tr': `${i * 45}deg`,
                    animation: 'confetti-burst 1s forwards ease-out',
                    animationDelay: '3s'
                  } as any}
                />
              ))}
            </div>
            
            <div className="flex gap-1">
              {"NOTE DELIVERED!".split("").map((char, i) => (
                <span 
                  key={i} 
                  className="text-white font-telegraph text-sm md:text-xl tracking-[0.2em] font-bold uppercase transition-opacity"
                  style={{ 
                    animation: 'letter-fade-in 0.2s forwards', 
                    animationDelay: `${3.2 + (i * 0.05)}s`,
                    opacity: 0
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Persistence fix: Restore content when theme transitions re-mount the editor
  useEffect(() => {
    if (editorRef.current && content && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [selectedTheme]);

  useEffect(() => {
    emailjs.init("a3C4Yxry8ehcUkVYV");
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      // Cleanup empty highlighter spans if editor is effectively empty
      const text = editorRef.current.innerText.replace(/\u200B/g, '').trim();
      if (text.length === 0) {
        const highlighterSpans = editorRef.current.querySelectorAll('.highlighter');
        highlighterSpans.forEach(span => {
          if (span.textContent?.replace(/\u200B/g, '').length === 0) {
            span.remove();
          }
        });
      }
      setContent(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    const cmdValue = command === 'formatBlock' && value ? `<${value.toUpperCase()}>` : value;
    
    if (command === 'foreColor') {
      if (activeTextColor === value) {
        document.execCommand('foreColor', false, 'inherit');
        setActiveTextColor(null);
      } else {
        document.execCommand('foreColor', false, cmdValue);
        setActiveTextColor(value || null);
      }
    } else if (command === 'formatBlock') {
      const isAlreadyActive = (value === 'h2' && activeFormats.h2) || (value === 'blockquote' && activeFormats.blockquote);
      document.execCommand('formatBlock', false, isAlreadyActive ? '<P>' : cmdValue);
    } else {
      document.execCommand(command, false, cmdValue);
    }
    handleInput();
    updateActiveFormats(); // Call immediately
  };

  const toggleHighlighter = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    
    // Get immediate state
    const currentFormats = updateActiveFormats();
    const isActuallyActive = highlighterMode || currentFormats.highlighter;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const highlightColor = '#add8e680'; // Faded light blue (fixed)

    if (selection.toString() !== '') {
      // Selection exists: toggle highlight on selection
      let container: Node | null = selection.anchorNode;
      let highlighterSpan: HTMLElement | null = null;
      while (container && container !== editorRef.current) {
        if (container instanceof HTMLElement && (container.classList.contains('highlighter') || container.style.backgroundColor !== '')) {
          highlighterSpan = container;
          break;
        }
        container = container.parentNode;
      }

      if (highlighterSpan) {
        const text = highlighterSpan.innerText;
        highlighterSpan.replaceWith(document.createTextNode(text));
        setHighlighterMode(false);
      } else {
        const span = document.createElement('span');
        span.className = 'highlighter';
        span.style.backgroundColor = highlightColor;
        span.style.color = 'black';
        span.appendChild(range.extractContents());
        range.insertNode(span);
        setHighlighterMode(true);
      }
    } else {
      // No selection: toggle mode for typing
      if (isActuallyActive) {
        // Force Disable: find if we are inside a span and move out
        let container: Node | null = selection.anchorNode;
        let highlighterSpan: HTMLElement | null = null;
        while (container && container !== editorRef.current) {
          if (container instanceof HTMLElement && (container.classList.contains('highlighter') || container.style.backgroundColor !== '')) {
            highlighterSpan = container;
            break;
          }
          container = container.parentNode;
        }

        if (highlighterSpan) {
          const newRange = document.createRange();
          newRange.setStartAfter(highlighterSpan);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          if (highlighterSpan.nextSibling === null || highlighterSpan.nextSibling.nodeType !== Node.TEXT_NODE) {
             const textNode = document.createTextNode('\u200B');
             highlighterSpan.after(textNode);
             newRange.setStartAfter(textNode);
             newRange.collapse(true);
             selection.removeAllRanges();
             selection.addRange(newRange);
          }
        }
        setHighlighterMode(false);
      } else {
        // Force Enable: insert ZWSP span
        const span = document.createElement('span');
        span.className = 'highlighter';
        span.style.backgroundColor = highlightColor;
        span.style.color = 'black';
        span.innerHTML = '&#8203;'; // ZWSP

        range.insertNode(span);
        range.setStartBefore(span.firstChild!);
        range.setEndAfter(span.firstChild!);
        range.collapse(false);

        selection.removeAllRanges();
        selection.addRange(range);
        setHighlighterMode(true);
      }
    }
    handleInput();
    updateActiveFormats();
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    // Sync formatting state on navigation keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Enter'].includes(e.key)) {
      setTimeout(updateActiveFormats, 0);
    }
  };

  const handleSend = async (type: 'direct' | 'link') => {
    if (!recipient || !content || content === '<br>') {
      setStatus({ type: 'error', message: 'Please provide a recipient (email) and a message.' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (type === 'direct' && !emailRegex.test(recipient)) {
      setStatus({ type: 'error', message: 'Please provide a valid email address.' });
      return;
    }

    setIsSending(true);
    setStatus({ type: null, message: '' });

    // --- Content Moderation Filter ---
    const plainText = (editorRef.current?.innerText || "").replace(/\u200B/g, "").trim().toLowerCase();
    const bannedWords = [
      // English
      'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'slut', 'whore', 'bastard', 'cunt', 'kill you', 'murder', 'rape', 'death threat', 'torture', 'terrorist', 'suicide', 'pedophile', 'nazi',
      // Hindi (Hinglish)
      'bc', 'mc', 'bhenchod', 'madarchod', 'bhosi', 'bhosdike', 'chutiya', 'gaandu', 'lauda', 'lavda', 'randi', 'saala', 'kamina', 'harami', 'bsdk', 'marna', 'balatkar', 'kalle', 'katle', 
      'dushkarm', 'kutte', 'haramzaade', 'lowde', 'lund', 'tatte', 'chipkali', 'chakke', 'hijra', 'beyimaan', 'saali', 'kamini', 'balatkaar', 'balatkart', 'dushkarm',
      // Hindi (Devanagari)
      'गाली', 'चूतिया', 'भोसड़ीके', 'मदरचोद', 'बहनचोद', 'साला', 'कमीना', 'हरामी', 'बलात्कार', 'दुष्कर्म', 'मार डालूंगा', 'कुत्ते', 'हरामजादे', 'रंडी'
    ];

    const containsBanned = bannedWords.some(word => plainText.includes(word));

    if (containsBanned) {
      setStatus({ 
        type: 'error', 
        message: "⚠️ Your message contains inappropriate content and cannot be sent." 
      });
      return;
    }
    // ---------------------------------

    try {
      const htmlContent = editorRef.current?.innerHTML || "";

      // Step 1 — Save note to Firebase
      const docRef = await db.collection("notes").add({
        message: htmlContent,
        theme_bg: selectedTheme.bgClass || "#0d0d0d",
        header_bg: selectedTheme.paperClass || "#fdf5e6",
        header_text_color: selectedTheme.accentColor || "#b89e7a",
        accent_color: selectedTheme.accentColor || "#b89e7a",
        font_family: selectedTheme.fontClass || "font-sans",
        text_color: selectedTheme.fontClass.split(' ').find(c => c.startsWith('text-')) || 'text-gray-800',
        timestamp: new Date(),
        opened: false
      });

      // Step 2 — Build unique link (Thing 2)
      const noteLink = "https://nonamenote.vercel.app/view/" + docRef.id;

      // Step 3 — Send that link via EmailJS
      await emailjs.send(
        'service_glaogum',
        'template_8uelz17',
        {
          to_email: recipient.trim(),
          note_link: noteLink
        }
      );

      // Trigger success animations
      if (sendButtonRef.current) {
        setButtonRect(sendButtonRef.current.getBoundingClientRect());
        setShowSendAnimation(true);
        setIsOverlayFadingOut(false);
        setTimeout(() => {
          setIsOverlayFadingOut(true);
          setTimeout(() => {
            setShowSendAnimation(false);
            setButtonRect(null);
            setIsOverlayFadingOut(false);
          }, 500);
        }, 6000);
      }

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: [selectedTheme.accentColor, '#ffffff', '#ffd700']
      });

      setStatus({ type: 'success', message: 'Note Delivered! Your message has been dispatched.' });
      
      if (editorRef.current) editorRef.current.innerHTML = '';
      setContent('');
      setRecipient('');

    } catch (error) {
      console.error('Action Error:', error);
      setStatus({ type: 'error', message: 'Failed to complete action. Please try again later.' });
    } finally {
      setIsSending(false);
    }
  };

  const scrollThemes = (direction: 'left' | 'right') => {
    if (themeScrollRef.current) {
      const scrollAmount = 300;
      themeScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const charCount = editorRef.current?.innerText.length || 0;

  if (viewingNoteId) {
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
            This note has expired or doesn't exist
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
        {/* Mute Toggle */}
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
              {/* Envelope Top Flap */}
              <div 
                className={`absolute top-0 left-0 w-full h-1/2 bg-[#A0522D] origin-top border-b border-black/10 z-40`} 
                style={{ 
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                  animation: envelopeOpened ? 'envelope-open-top 1.5s forwards ease-in-out' : 'none'
                }} 
              />
              
              {/* The "Card" (Note) inside the envelope */}
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

              {/* Envelope Body */}
              <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[180px] md:border-l-[224px] border-l-transparent border-r-[180px] md:border-r-[224px] border-r-transparent border-b-[120px] md:border-b-[150px] border-b-[#A0522D] z-30 pointer-events-none" />
              
              {!envelopeOpened && (
                 <div className="absolute inset-0 bg-[#8B4513] flex flex-col items-center justify-center gap-4 z-10">
                    <Mail size={48} className="text-[#f4e4c1]" />
                    <p className="font-serif-elegant tracking-[0.2em] text-[#f4e4c1] text-xs uppercase animate-pulse">Click to open</p>
                 </div>
              )}
            </div>
          ) : (
            /* Revealed Note */
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className={`w-full max-w-[600px] p-10 md:p-14 relative flex flex-col shadow-2xl rounded-[16px]`}
              style={{
                backgroundColor: 'white', // Base card color fallback
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

  return (
    <div className={`min-h-screen transition-all duration-700 ${selectedTheme.bgClass} flex flex-col font-sans overflow-x-hidden selection:bg-[#b89e7a]/40`}>
      <header className="pt-8 pb-4 w-full flex justify-center">
         <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl px-8 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border-2 border-[#b89e7a] flex items-center justify-center text-[#b89e7a] text-2xl font-bold font-serif-elegant">N</div>
            <div className="flex flex-col items-start leading-none">
              <h1 className="text-3xl font-serif-elegant tracking-[0.2em] text-[#b89e7a] uppercase font-light">
                NoNameNote
              </h1>
              <span className="text-[9px] text-[#b89e7a]/40 tracking-[0.3em] uppercase font-bold pl-0.5 mt-1">
                Anonymous and Secure
              </span>
            </div>
          </div>

          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white/80"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </motion.div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-6 md:py-8 flex flex-col gap-6">
        <section className="relative flex flex-col gap-0 shadow-2xl">
          <div className="flex flex-col bg-[#1a1a1a] border border-[#333] rounded-t-sm divide-y divide-[#333]">
            {/* Row 1: Formatting Tools */}
            <div className="flex items-center px-4 py-2 md:px-6">
              <div className="flex items-center justify-between w-full overflow-x-auto scrollbar-hide">
                <button 
                  onClick={() => execCommand('formatBlock', 'h2')}
                  className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats.h2 ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`}
                  title="Heading"
                >
                  <Heading size={18} />
                </button>
                <div className="h-4 w-[1px] bg-[#333] shrink-0 mx-1"></div>
                <button 
                  onClick={() => execCommand('bold')} 
                  className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats.bold ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} 
                  title="Bold"
                >
                  <Bold size={18} />
                </button>
                <button 
                  onClick={() => execCommand('italic')} 
                  className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats.italic ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} 
                  title="Italic"
                >
                  <Italic size={18} />
                </button>
                <button 
                  onClick={() => execCommand('underline')} 
                  className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats.underline ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} 
                  title="Underline"
                >
                  <Underline size={18} />
                </button>
                <button 
                  onClick={toggleHighlighter} 
                  className={`p-2 transition-all rounded-sm flex-shrink-0 relative group ${highlighterMode ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} 
                  title="Highlighter"
                >
                   <Highlighter size={18} />
                </button>
                <button 
                  onClick={() => execCommand('formatBlock', 'blockquote')}
                  className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats.blockquote ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`}
                  title="Quote"
                >
                  <Quote size={18} fill={activeFormats.blockquote ? "#b89e7a" : "none"} />
                </button>
              </div>
            </div>

            {/* Row 2: Alignment & Color selection */}
            <div className="flex items-center justify-between px-4 py-2 md:px-6 bg-[#151515] overflow-x-hidden">
              <div className="flex items-center justify-between w-full gap-2 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => execCommand('justifyLeft')} 
                    className={`p-1.5 transition-all rounded-sm ${activeFormats.justifyLeft ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} 
                    title="Align Left"
                  >
                    <AlignLeft size={18} />
                  </button>
                  <button 
                    onClick={() => execCommand('justifyCenter')} 
                    className={`p-1.5 transition-all rounded-sm ${activeFormats.justifyCenter ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} 
                    title="Align Center"
                  >
                    <AlignCenter size={18} />
                  </button>
                  <button 
                    onClick={() => execCommand('justifyRight')} 
                    className={`p-1.5 transition-all rounded-sm ${activeFormats.justifyRight ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} 
                    title="Align Right"
                  >
                    <AlignRight size={18} />
                  </button>
                </div>
                
                <div className="h-4 w-[1px] bg-[#333] shrink-0"></div>
 
                <div className="flex gap-2.5 p-1 bg-black/40 rounded-sm border border-white/5 overflow-x-auto scrollbar-hide flex-1 justify-between px-2">
                  {['#ffffff', '#000000', '#b89e7a', '#ff4d4d', '#4dff4d', '#4d4dff', '#ffff4d'].map(color => (
                      <button 
                      key={color}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCommand('foreColor', color);
                      }}
                      className={`w-4 h-4 rounded-sm hover:scale-110 active:scale-95 transition-all shadow-[0_0_5px_rgba(0,0,0,0.5)] border shrink-0 ${activeTextColor === color ? 'border-white scale-110 ring-1 ring-[#b89e7a]' : 'border-white/10'}`}
                      style={{ backgroundColor: color }}
                      title={`Text Color: ${color}`}
                      />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTheme.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`min-h-[420px] p-10 md:p-16 relative flex flex-col transition-all duration-1000 ${selectedTheme.paperClass} ${selectedTheme.fontClass}`}
            >
              <div className="flex justify-between border-b border-current opacity-20 pb-2 mb-10">
                <span className="font-telegraph text-[10px] uppercase italic">Dispatch No. {Math.floor(Math.random() * 999)}-X</span>
                <span className="font-telegraph text-[10px] uppercase">Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
              </div>

              <div 
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onKeyDown={handleEditorKeyDown}
                className={`flex-1 outline-none text-xl md:text-2xl leading-relaxed whitespace-pre-wrap ${selectedTheme.fontClass} min-h-[250px] empty:before:content-[attr(placeholder)] empty:before:opacity-20`}
                placeholder="Compose your secure transmission here..."
              />

              <div className="mt-8 flex justify-between items-end relative">
                <div className="flex flex-col items-start translate-y-1">
                   <div className={`text-[10px] uppercase tracking-wider font-mono opacity-90 ${charCount > CHAR_LIMIT ? 'text-red-500 font-bold opacity-100 scale-110 origin-left' : ''}`}>
                    {charCount} / {CHAR_LIMIT}
                  </div>
                </div>
                <img src={`data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 60 60'><circle cx='30' cy='30' r='29' fill='none' stroke='${selectedTheme.accentColor}' stroke-width='0.3' opacity='0.4'/><circle cx='30' cy='30' r='25' fill='none' stroke='${selectedTheme.accentColor}' stroke-width='0.5' stroke-dasharray='4 2' opacity='0.6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='serif' font-size='6.5' font-weight='bold' fill='${selectedTheme.accentColor}' opacity='0.6' transform='rotate(-15 30 30)'>NONAMENOTE</text></svg>`)}`} className="w-20 h-20 pointer-events-none" alt="stamped" />
              </div>
            </motion.div>
          </AnimatePresence>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          <div className="md:col-span-12 lg:col-span-5 flex flex-col gap-2">
            <label className="text-[10px] text-[#b89e7a] uppercase tracking-[0.3em] font-black mb-1 px-1">
              Recipient Destination
            </label>
            <input 
              type="email" 
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="example@mail.com"
              className="bg-[#1a1a1a] border border-[#333] text-sm p-4 w-full text-white focus:outline-none focus:border-[#b89e7a] transition-all rounded-sm placeholder:text-white/10"
            />
          </div>
          
          <div className="md:col-span-12 lg:col-span-7 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <label className="text-[10px] text-[#b89e7a] uppercase tracking-[0.3em] font-black">Stationery Themes</label>
              <div className="flex gap-2">
                <button onClick={() => scrollThemes('left')} className="text-white/20 hover:text-[#b89e7a] transition-colors"><ChevronLeft size={16} /></button>
                <button onClick={() => scrollThemes('right')} className="text-white/20 hover:text-[#b89e7a] transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div 
              ref={themeScrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide snap-x py-1"
            >
              {THEMES.map((theme) => (
                <button
                   key={theme.id}
                   onClick={() => setSelectedTheme(theme)}
                   className={`flex-shrink-0 w-24 h-14 rounded-md transition-all border snap-start flex items-center justify-center p-1 relative overflow-hidden group ${
                     selectedTheme.id === theme.id 
                     ? 'border-[#b89e7a] scale-105 shadow-xl z-10' 
                     : 'border-[#333] opacity-60 hover:opacity-100 hover:border-[#555]'
                   } ${theme.bgClass}`}
                 >
                  <div className={`w-full h-full rounded-sm flex items-center justify-center text-[8px] uppercase font-black text-center leading-tight transition-all ${theme.paperClass} ${theme.fontClass} border-0 shadow-none`}>
                    <span className="relative z-50">{theme.name.replace(' ', '\n')}</span>
                  </div>
                 </button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 mt-4">
          <div className="flex gap-4">
            <button 
              ref={sendButtonRef}
              onClick={() => handleSend('link')}
              disabled={isSending || charCount > CHAR_LIMIT}
              className="flex-1 bg-[#b89e7a] text-[#0d0d0d] font-bold py-4 uppercase tracking-[0.2em] text-xs hover:bg-[#c9bda4] transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-3 relative overflow-hidden"
            >
              {isSending && !showSendAnimation ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Generating Link...</span>
                </div>
              ) : "SEND TEXT ANONYMOUSLY"}
            </button>
          </div>

          <AnimatePresence>
            {status.type && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-4 border text-[11px] uppercase tracking-[0.1em] font-bold flex items-center gap-3 ${status.type === 'success' ? 'bg-green-500/5 text-green-400 border-green-500/20' : 'bg-red-500/5 text-red-400 border-red-500/20'}`}
              >
                {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {status.message}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <footer className="py-12 mt-auto flex flex-col items-center gap-6 border-t border-white/5 opacity-40">
          <div className="flex flex-col items-center gap-2">
            <p className="text-[9px] uppercase tracking-[0.5em] text-[#b89e7a] font-medium text-center px-4">No Logs &bull; No Identity &bull; Only Words</p>
            <p className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-mono">Confidential Service &copy; 2026</p>
          </div>
      </footer>

      {showSendAnimation && <SendAnimationOverlay />}
    </div>
  );
}

