import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Send, Mail, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, Heading, Highlighter, Quote
} from 'lucide-react';
import confetti from 'canvas-confetti';
import emailjs from '@emailjs/browser';
import { db } from './firebase';
import { Theme, THEMES, CHAR_LIMIT } from './types';

export default function MainApp() {
  const [content, setContent] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>(THEMES[0]);
  const [activeTextColor, setActiveTextColor] = useState<string | null>(null);
  const [activeFormats, setActiveFormats] = useState<{ [key: string]: boolean }>({});
  const [highlighterMode, setHighlighterMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const editorRef = useRef<HTMLDivElement>(null);
  const themeScrollRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const [showSendAnimation, setShowSendAnimation] = useState(false);
  const [isOverlayFadingOut, setIsOverlayFadingOut] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
  }, []);

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
    
    if (selection && selection.isCollapsed) {
      if (inHighlighterContext) {
        setHighlighterMode(true);
      } else {
        setHighlighterMode(false);
      }
    }
    return { ...formats, highlighter: inHighlighterContext };
  }, []);

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

  const handleInput = () => {
    if (editorRef.current) {
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
    updateActiveFormats();
  };

  const toggleHighlighter = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const currentFormats = updateActiveFormats();
    const isActuallyActive = highlighterMode || currentFormats.highlighter;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const highlightColor = '#add8e680';

    if (selection.toString() !== '') {
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
      if (isActuallyActive) {
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
        const span = document.createElement('span');
        span.className = 'highlighter';
        span.style.backgroundColor = highlightColor;
        span.style.color = 'black';
        span.innerHTML = '&#8203;';
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

  const handleSend = async (type: 'direct' | 'link') => {
    if (!recipient || !content || content === '<br>') {
      setStatus({ type: 'error', message: 'Please provide a recipient (email) and a message.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient)) {
      setStatus({ type: 'error', message: 'Please provide a valid email address.' });
      return;
    }

    setIsSending(true);
    setStatus({ type: null, message: '' });

    const plainText = (editorRef.current?.innerText || "").replace(/\u200B/g, "").trim().toLowerCase();
    const bannedWords = [
      'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'slut', 'whore', 'bastard', 'cunt', 'kill you', 'murder', 'rape', 'death threat', 'torture', 'terrorist', 'suicide', 'pedophile', 'nazi',
      'bc', 'mc', 'bhenchod', 'madarchod', 'bhosi', 'bhosdike', 'chutiya', 'gaandu', 'lauda', 'lavda', 'randi', 'saala', 'kamina', 'harami', 'bsdk', 'marna', 'balatkar', 'kalle', 'katle', 
      'dushkarm', 'kutte', 'haramzaade', 'lowde', 'lund', 'tatte', 'chipkali', 'chakke', 'hijra', 'beyimaan', 'saali', 'kamini', 'balatkaar', 'balatkart', 'dushkarm',
      'गाली', 'चूतिया', 'भोसड़ीके', 'मदरचोद', 'बहनचोद', 'साला', 'कमीना', 'हरामी', 'बलात्कार', 'दुष्कर्म', 'मार डालूंगा', 'कुत्ते', 'हरामजादे', 'रंडी'
    ];

    const containsBanned = bannedWords.some(word => plainText.includes(word));
    if (containsBanned) {
      setStatus({ type: 'error', message: "⚠️ Your message contains inappropriate content and cannot be sent." });
      setIsSending(false);
      return;
    }

    try {
      const htmlContent = editorRef.current?.innerHTML || "";
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

      const noteLink = window.location.origin + "/view/" + docRef.id;

      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          to_email: recipient.trim(),
          note_link: noteLink
        }
      );

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
        </motion.div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-6 md:py-8 flex flex-col gap-6">
        <section className="relative flex flex-col gap-0 shadow-2xl">
          <div className="flex flex-col bg-[#1a1a1a] border border-[#333] rounded-t-sm divide-y divide-[#333]">
            <div className="flex items-center px-4 py-2 md:px-6">
              <div className="flex items-center justify-between w-full overflow-x-auto scrollbar-hide">
                <button onClick={() => execCommand('formatBlock', 'h2')} className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats.h2 ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Heading"><Heading size={18} /></button>
                <div className="h-4 w-[1px] bg-[#333] shrink-0 mx-1"></div>
                <button onClick={() => execCommand('bold')} className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats.bold ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Bold"><Bold size={18} /></button>
                <button onClick={() => execCommand('italic')} className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats.italic ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Italic"><Italic size={18} /></button>
                <button onClick={() => execCommand('underline')} className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats.underline ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Underline"><Underline size={18} /></button>
                <button onClick={toggleHighlighter} className={`p-2 transition-all rounded-sm flex-shrink-0 relative group ${highlighterMode ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Highlighter"><Highlighter size={18} /></button>
                <button onClick={() => execCommand('formatBlock', 'blockquote')} className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats.blockquote ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Quote"><Quote size={18} fill={activeFormats.blockquote ? "#b89e7a" : "none"} /></button>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 md:px-6 bg-[#151515] overflow-x-hidden">
              <div className="flex items-center justify-between w-full gap-2 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => execCommand('justifyLeft')} className={`p-1.5 transition-all rounded-sm ${activeFormats.justifyLeft ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`}><AlignLeft size={18} /></button>
                  <button onClick={() => execCommand('justifyCenter')} className={`p-1.5 transition-all rounded-sm ${activeFormats.justifyCenter ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`}><AlignCenter size={18} /></button>
                  <button onClick={() => execCommand('justifyRight')} className={`p-1.5 transition-all rounded-sm ${activeFormats.justifyRight ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`}><AlignRight size={18} /></button>
                </div>
                <div className="h-4 w-[1px] bg-[#333] shrink-0"></div>
                <div className="flex gap-2.5 p-1 bg-black/40 rounded-sm border border-white/5 overflow-x-auto scrollbar-hide flex-1 justify-between px-2">
                  {['#ffffff', '#000000', '#b89e7a', '#ff4d4d', '#4dff4d', '#4d4dff', '#ffff4d'].map(color => (
                    <button key={color} onMouseDown={(e) => { e.preventDefault(); execCommand('foreColor', color); }} className={`w-4 h-4 rounded-sm hover:scale-110 active:scale-95 transition-all shadow-[0_0_5px_rgba(0,0,0,0.5)] border shrink-0 ${activeTextColor === color ? 'border-white scale-110 ring-1 ring-[#b89e7a]' : 'border-white/10'}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={selectedTheme.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`min-h-[420px] p-10 md:p-16 relative flex flex-col transition-all duration-1000 ${selectedTheme.paperClass} ${selectedTheme.fontClass}`}>
              <div className="flex justify-between border-b border-current opacity-20 pb-2 mb-10">
                <span className="font-telegraph text-[10px] uppercase italic">Dispatch No. {Math.floor(Math.random() * 999)}-X</span>
                <span className="font-telegraph text-[10px] uppercase">Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
              </div>
              <div ref={editorRef} contentEditable onInput={handleInput} onKeyDown={(e) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Enter'].includes(e.key)) setTimeout(updateActiveFormats, 0); }} className={`flex-1 outline-none text-xl md:text-2xl leading-relaxed whitespace-pre-wrap ${selectedTheme.fontClass} min-h-[250px] empty:before:content-[attr(data-placeholder)] empty:before:opacity-20`} data-placeholder="Compose your secure transmission here..." />
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
            <label className="text-[10px] text-[#b89e7a] uppercase tracking-[0.3em] font-black mb-1 px-1">Recipient Destination</label>
            <input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="example@mail.com" className="bg-[#1a1a1a] border border-[#333] text-sm p-4 w-full text-white focus:outline-none focus:border-[#b89e7a] transition-all rounded-sm placeholder:text-white/10" />
          </div>
          <div className="md:col-span-12 lg:col-span-7 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <label className="text-[10px] text-[#b89e7a] uppercase tracking-[0.3em] font-black">Stationery Themes</label>
              <div className="flex gap-2">
                <button onClick={() => scrollThemes('left')} className="text-white/20 hover:text-[#b89e7a] transition-colors"><ChevronLeft size={16} /></button>
                <button onClick={() => scrollThemes('right')} className="text-white/20 hover:text-[#b89e7a] transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div ref={themeScrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x py-1">
              {THEMES.map((theme) => (
                <button key={theme.id} onClick={() => setSelectedTheme(theme)} className={`flex-shrink-0 w-24 h-14 rounded-md transition-all border snap-start flex items-center justify-center p-1 relative overflow-hidden group ${selectedTheme.id === theme.id ? 'border-[#b89e7a] scale-105 shadow-xl z-10' : 'border-[#333] opacity-60 hover:opacity-100 hover:border-[#555]'} ${theme.bgClass}`}>
                  <div className={`w-full h-full rounded-sm flex items-center justify-center text-[8px] uppercase font-black text-center leading-tight transition-all ${theme.paperClass} ${theme.fontClass} border-0 shadow-none`}><span className="relative z-50">{theme.name.replace(' ', '\n')}</span></div>
                 </button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 mt-4">
          <button ref={sendButtonRef} onClick={() => handleSend('link')} disabled={isSending || charCount > CHAR_LIMIT} className="flex-1 bg-[#b89e7a] text-[#0d0d0d] font-bold py-4 uppercase tracking-[0.2em] text-xs hover:bg-[#c9bda4] transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-3 relative overflow-hidden">
            {isSending && !showSendAnimation ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                <span>Generating Link...</span>
              </div>
            ) : "SEND TEXT ANONYMOUSLY"}
          </button>
          <AnimatePresence>
            {status.type && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 border text-[11px] uppercase tracking-[0.1em] font-bold flex items-center gap-3 ${status.type === 'success' ? 'bg-green-500/5 text-green-400 border-green-500/20' : 'bg-red-500/5 text-red-400 border-red-500/20'}`}>
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

      {showSendAnimation && (
        <div className={`fixed inset-0 z-[9999] pointer-events-none overflow-hidden transition-opacity duration-500 ${isOverlayFadingOut ? 'opacity-0' : 'opacity-1'}`}>
          <div className="absolute transition-all ease-in-out" style={{ top: `${buttonRect?.top}px`, left: `${buttonRect?.left}px`, width: `${buttonRect?.width}px`, height: `${buttonRect?.height}px`, backgroundColor: '#b89e7a', animation: 'morph-to-circle 0.6s forwards ease-in-out', '--initial-width': `${buttonRect?.width}px`, '--initial-height': `${buttonRect?.height}px` } as any}>
            <div className="absolute top-1/2 left-1/2 w-full h-full">
               <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white/30 rounded-full" style={{ animation: 'circle-pulse 0.4s forwards', animationDelay: '0.8s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" style={{ animation: 'plane-pop 0.3s forwards, plane-launch 1.4s forwards', animationDelay: '0.6s, 1s' }}>
                  <div style={{ animation: 'plane-bob 0.5s infinite ease-in-out', animationDelay: '1s' }}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                  </div>
                 </div>
             </div>
           </div>
           <div className="absolute inset-0 bg-[#1a3a6b] flex flex-col items-center justify-center pointer-events-auto" style={{ opacity: 0, animation: 'letter-fade-in 0.5s forwards', animationDelay: '2.4s' }}>
            <div className="flex flex-col items-center gap-8">
              <Mail size={80} className="text-white" style={{ animation: 'plane-pop 0.5s forwards', animationDelay: '2.8s', opacity: 0 }} />
              <div className="flex gap-1">
                {"NOTE DELIVERED!".split("").map((char, i) => (
                  <span key={i} className="text-white font-telegraph text-sm md:text-xl tracking-[0.2em] font-bold uppercase transition-opacity" style={{ animation: 'letter-fade-in 0.2s forwards', animationDelay: `${3.2 + (i * 0.05)}s`, opacity: 0 }}>{char === " " ? "\u00A0" : char}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
