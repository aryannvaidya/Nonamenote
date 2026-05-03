import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Send, Mail, CheckCircle2, AlertCircle, History, X, Check,
  ChevronLeft, ChevronRight, Heading, Highlighter, Quote
} from 'lucide-react';

// Helper for relative time
const getRelativeTime = (timestamp: number | string | null) => {
  if (!timestamp) return '';
  const date = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - date);
  
  if (isNaN(date)) return 'unknown';

  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

function normalizeText(text: string) {
  return text
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/1/g, 'i')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/(\b\w\s){2,}/g, match => match.replace(/\s/g, ''))
    .replace(/(\b\w\.){2,}/g, match => match.replace(/\./g, ''))
    .replace(/[!|]/g, 'l')
    .replace(/\*/g, 'u')
    .toLowerCase();
}

async function scanWithAI(text: string) {
  try {
    const response = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const result = await response.json();
    if (!response.ok) {
      console.error('API Error (Moderation):', response.status, result);
      return result.toxic || false;
    }
    return result.toxic;
  } catch (error) {
    console.error('Moderation fetch failed:', error);
    return false;
  }
}
import confetti from 'canvas-confetti';
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
  const [nextAvailableTime, setNextAvailableTime] = useState<string>('');
  const [showLogs, setShowLogs] = useState(false);
  const [showRulesOverlay, setShowRulesOverlay] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [understoodResponsibility, setUnderstoodResponsibility] = useState(false);
  const [logs, setLogs] = useState<{ id: string; noteId?: string; recipient: string; content: string; timestamp: number; hasUnread?: boolean; replyCount?: number; opened?: boolean; openedAt?: number }[]>([]);
  const [activeLogThread, setActiveLogThread] = useState<string | null>(null);
  const [activeNoteData, setActiveNoteData] = useState<any>(null);
  const [showFullTime, setShowFullTime] = useState<{[key: string]: boolean}>({});
  const [replies, setReplies] = useState<{ [noteId: string]: any[] }>({});

  const editorRef = useRef<HTMLDivElement>(null);
  const themeScrollRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const rulesAccepted = localStorage.getItem('rulesAccepted');
    if (!rulesAccepted) {
      setShowRulesOverlay(true);
    }
    const savedLogs = localStorage.getItem('sentNotesLog');
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        setLogs(parsed);
        checkAllReplies(parsed);
      } catch (e) {
        console.error("Failed to parse logs", e);
      }
    }
  }, []);

  const handleAcceptRules = () => {
    localStorage.setItem('rulesAccepted', 'true');
    setShowRulesOverlay(false);
  };

  const checkAllReplies = async (currentLogs: any[]) => {
    const updatedLogs = [...currentLogs];
    let changed = false;

    for (let i = 0; i < updatedLogs.length; i++) {
      const log = updatedLogs[i];
      if (log.noteId) {
        try {
          // Get note status
          const response = await fetch('/api/get-note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ noteId: log.noteId })
          });
          if (!response.ok) continue;
          
          const { note } = await response.json();
          
          if (note) {
            const isOpened = note.opened || false;
            const openedAtValue = note.openedAt ? new Date(note.openedAt).getTime() : null;
            
            if (log.opened !== isOpened || log.openedAt !== openedAtValue) {
              updatedLogs[i] = { ...updatedLogs[i], opened: isOpened, openedAt: openedAtValue };
              changed = true;
            }

            // Get replies from separate endpoint (Step 5)
            const repliesRes = await fetch('/api/get-replies', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ noteId: log.noteId })
            });
            
            if (repliesRes.ok) {
              const { replies: repliesData } = await repliesRes.json();
              const unreadCount = (repliesData || []).filter((r: any) => !r.read).length;
              
              if (log.hasUnread !== (unreadCount > 0) || log.replyCount !== repliesData?.length) {
                updatedLogs[i] = { ...updatedLogs[i], hasUnread: unreadCount > 0, replyCount: repliesData?.length };
                changed = true;
              }
              
              setReplies(prev => ({ ...prev, [log.noteId!]: repliesData || [] }));
            }
          }
        } catch (e) {
          console.error("Failed to check status for", log.noteId, e);
        }
      }
    }

    if (changed) {
      setLogs(updatedLogs);
      localStorage.setItem('sentNotesLog', JSON.stringify(updatedLogs));
    }
  };

  const saveToLogs = (recipient: string, contentHTML: string, noteId?: string) => {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      noteId,
      recipient,
      content: contentHTML.substring(0, 500), // Safety limit for storage
      timestamp: Date.now()
    };
    
    setLogs(prev => {
      const updated = [newLog, ...prev];
      const slice = updated.slice(0, 50);
      localStorage.setItem('sentNotesLog', JSON.stringify(slice));
      return slice;
    });
  };
  const [showSendAnimation, setShowSendAnimation] = useState(false);
  const [isOverlayFadingOut, setIsOverlayFadingOut] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // emailjs removed - use backend
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

  const canSendNote = () => {
    const lastSent = localStorage.getItem('lastSentTime');
    if (!lastSent) return true;
    const hoursPassed = (Date.now() - parseInt(lastSent)) / (1000 * 60 * 60);
    return hoursPassed >= 24;
  };

  const getTimeRemaining = () => {
    const lastSentStr = localStorage.getItem('lastSentTime');
    if (!lastSentStr) return '';
    const lastSent = parseInt(lastSentStr);
    const msRemaining = (lastSent + 24 * 60 * 60 * 1000) - Date.now();
    if (msRemaining <= 0) return '';
    
    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = getTimeRemaining();
      setNextAvailableTime(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status.type === 'error' && status.message.includes('Next note available in:')) {
      const timer = setInterval(() => {
        const remaining = getTimeRemaining();
        if (remaining) {
          setStatus(prev => ({
            ...prev,
            message: `⏳ You can only send one note every 24 hours.\nNext note available in: ${remaining}`
          }));
        } else {
          setStatus({ type: null, message: '' });
          clearInterval(timer);
        }
      }, 60000); 
      return () => clearInterval(timer);
    }
  }, [status.message, status.type]);

  const handleSend = async (type: 'direct' | 'link') => {
    if (!canSendNote()) {
      const remaining = getTimeRemaining();
      setStatus({ 
        type: 'error', 
        message: `⏳ You can only send one note every 24 hours.\nNext note available in: ${remaining}` 
      });
      return;
    }

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

    // Validate environment (handled by server now, but keep some basic frontend sanity)
    const requiredEnvMessage = "The application server needs to be configured with the necessary tokens.";

    const plainText = (editorRef.current?.innerText || "").replace(/\u200B/g, "").trim();
    const normalizedText = normalizeText(plainText);
    const bannedWords = [
      'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'slut', 'whore', 'bastard', 'cunt', 'kill you', 'murder', 'rape', 'death threat', 'torture', 'terrorist', 'suicide', 'pedophile', 'nazi',
      'bc', 'mc', 'bhenchod', 'madarchod', 'bhosi', 'bhosdike', 'chutiya', 'gaandu', 'lauda', 'lavda', 'randi', 'saala', 'kamina', 'harami', 'bsdk', 'marna', 'balatkar', 'kalle', 'katle', 
      'dushkarm', 'kutte', 'haramzaade', 'lowde', 'lund', 'tatte', 'chipkali', 'chakke', 'hijra', 'beyimaan', 'saali', 'kamini', 'balatkaar', 'balatyaar', 'dushkarm',
      'गाली', 'चूतिया', 'भोसड़ीके', 'मदरचोद', 'बहनचोद', 'साला', 'कमीना', 'हरामी', 'बलात्कार', 'दुष्कर्म', 'मार डालूंगा', 'कुत्ते', 'हरामजादे', 'रंडी'
    ];

    const containsBanned = bannedWords.some(word => normalizedText.includes(word));
    if (containsBanned) {
      setStatus({ type: 'error', message: "⚠️ Your message contains inappropriate content and cannot be sent." });
      setIsSending(false);
      return;
    }

    console.log('Step 1: Starting moderation check...');
    setStatus({ type: null, message: '🔍 Scanning message for safety...' });
    const isToxic = await scanWithAI(plainText);
    if (isToxic) {
      setStatus({ 
        type: 'error', 
        message: "⚠️ Your message was flagged for harmful content and cannot be sent.\nNoNameNote does not allow abusive, threatening or inappropriate messages." 
      });
      setIsSending(false);
      return;
    }

    try {
      setStatus({ type: null, message: 'Encryption in progress: Securing transmission...' });
      const noteCard = document.getElementById('note-card');
      const noteHTML = noteCard?.outerHTML || "";
      
      console.log('Step 2: Saving to Firebase...');
      const saveResponse = await fetch('/api/save-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          noteHTML,
          theme_bg: selectedTheme.bgClass || "#0d0d0d",
          timestamp: Date.now()
        })
      });

      const saveData = await saveResponse.json();
      if (!saveResponse.ok) {
        console.error('API Error (Save Note):', saveResponse.status, saveData);
        throw new Error(saveData.message || saveData.error || 'Failed to save note');
      }
      const { noteId } = saveData;

      setStatus({ type: null, message: 'Routing: Dispatching secure link...' });
      const noteLink = window.location.origin + "/view/" + noteId;

      console.log('Step 3: Sending email...');
      const sendResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to_email: recipient.trim(), 
          note_link: noteLink 
        })
      });

      if (!sendResponse.ok) {
        const errData = await sendResponse.json();
        console.error('API Error (Send Email):', sendResponse.status, errData);
        throw new Error(errData.instruction || errData.error || 'Failed to send email');
      }

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
      const now = Date.now().toString();
      localStorage.setItem('lastSentTime', now);
      saveToLogs(recipient, content, noteId); // Updated with backend ID
      setNextAvailableTime(getTimeRemaining()); // Provide immediate UI lock
      if (editorRef.current) editorRef.current.innerHTML = '';
      setContent('');
      setRecipient('');
    } catch (error: any) {
      console.error('Action Error:', error);
      setStatus({ 
        type: 'error', 
        message: error.message || 'Failed to complete action. Please try again later.' 
      });
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
              <span className="text-[9px] text-[#b89e7a]/40 tracking-[0.15em] uppercase font-bold pl-0.5 mt-1 whitespace-nowrap">
                What you feel, not who you are.
              </span>
            </div>
          </div>
        </motion.div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-6 md:py-8 flex flex-col gap-2">
        <div className="flex justify-end px-2 mb-1">
          <button 
            onClick={() => setShowLogs(true)}
            className="group flex items-center gap-2 text-[10px] font-black text-[#b89e7a] uppercase tracking-[0.4em] hover:text-white transition-colors border-b border-[#b89e7a]/20 pb-1 relative"
          >
            <div className="relative">
              <History size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />
              {logs.some(l => l.hasUnread) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-[#1a1a1a]" />
              )}
            </div>
            Logs
          </button>
        </div>

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

          <AnimatePresence>
            <motion.div id="note-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`min-h-[420px] p-10 md:p-16 relative flex flex-col transition-all duration-1000 ${selectedTheme.paperClass} ${selectedTheme.fontClass}`}>
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

        <section className="flex flex-col gap-4 mt-4 items-center">
          <button 
            ref={sendButtonRef} 
            onClick={() => handleSend('link')} 
            disabled={isSending || charCount > CHAR_LIMIT || !!nextAvailableTime} 
            className={`w-full font-bold py-4 uppercase tracking-[0.2em] text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden
              ${!!nextAvailableTime 
                ? 'bg-[#333] text-white/20 cursor-not-allowed opacity-50' 
                : 'bg-[#b89e7a] text-[#0d0d0d] hover:bg-[#c9bda4] shadow-xl'
              }
            `}
          >
            {isSending && !showSendAnimation ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                <span className="animate-pulse">{status.message || "Initializing..."}</span>
              </div>
            ) : !!nextAvailableTime ? "LIMIT REACHED" : "SEND TEXT ANONYMOUSLY"}
          </button>
          
          {nextAvailableTime && (
            <div className="flex items-center gap-2 text-[#b89e7a]/40 font-bold text-[9px] uppercase tracking-[0.2em] animate-pulse">
              <span className="w-1.5 h-1.5 bg-[#b89e7a]/20 rounded-full" />
              Next dispatch available in: {nextAvailableTime}
            </div>
          )}
        </section>
          <AnimatePresence>
            {status.type && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 border text-[11px] uppercase tracking-[0.1em] font-bold flex items-center gap-3 ${status.type === 'success' ? 'bg-green-500/5 text-green-400 border-green-500/20' : 'bg-red-500/5 text-red-400 border-red-500/20'}`}>
                {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {status.message}
              </motion.div>
            )}
          </AnimatePresence>
      </main>

      {/* Sent Logs Modal */}
      <AnimatePresence>
        {showLogs && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
            onClick={() => { setShowLogs(false); setActiveLogThread(null); }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full ${activeLogThread ? 'max-w-3xl' : 'max-w-lg'} bg-[#1a1a1a] border border-white/5 p-8 flex flex-col gap-6 max-h-[85vh] overflow-hidden relative transition-all duration-300`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-6">
                <div className="flex flex-col">
                  <h3 className="text-[#b89e7a] font-serif text-xl tracking-tight">
                    {activeLogThread ? 'Transmission Thread' : 'Transmission Logs'}
                  </h3>
                  {activeLogThread && (
                    <button 
                      onClick={() => { setActiveLogThread(null); setActiveNoteData(null); }}
                      className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold hover:text-white transition-colors mt-1 flex items-center gap-1"
                    >
                      ← Back to archives
                    </button>
                  )}
                </div>
                <button onClick={() => { setShowLogs(false); setActiveLogThread(null); setActiveNoteData(null); }} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {!activeLogThread ? (
                  // List View
                  logs.length === 0 ? (
                    <div className="py-20 text-center text-white/60 italic text-sm tracking-wider">No archives found...</div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {logs.map(log => (
                        <div 
                          key={log.id} 
                          onClick={async () => {
                            if (log.noteId) {
                              setActiveLogThread(log.noteId);
                              // Mark all replies in this thread as read locally
                              setLogs(prev => {
                                const next = prev.map(l => l.noteId === log.noteId ? { ...l, hasUnread: false } : l);
                                localStorage.setItem('sentNotesLog', JSON.stringify(next));
                                return next;
                              });

                              // Fetch full note data for theme and content
                              try {
                                const response = await fetch('/api/get-note', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ noteId: log.noteId })
                                });
                                if (response.ok) {
                                  const { note } = await response.json();
                                  setActiveNoteData(note);
                                }
                              } catch (e) {
                                console.error("Error fetching note details", e);
                              }
                            }
                          }}
                          className={`group border-b border-white/5 pb-4 pt-2 cursor-pointer hover:bg-white/[0.02] transition-colors -mx-2 px-2 rounded-sm ${log.hasUnread ? 'bg-red-500/[0.03]' : ''}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-[#b89e7a] tracking-wider break-all">{log.recipient}</span>
                            <span className="text-[8px] text-white/20 font-mono flex-shrink-0">
                              {!isNaN(new Date(log.timestamp).getTime()) ? new Date(log.timestamp).toLocaleDateString() : 'unknown'}
                            </span>
                          </div>
                          
                          <div 
                            className="text-[11px] text-white/40 truncate italic pr-4 mb-2"
                            dangerouslySetInnerHTML={{ 
                              __html: log.content.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '$1').replace(/<[^>]+>/g, ' ') 
                            }}
                          />

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[7px] font-black tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-xs ${log.opened ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                {log.opened ? 'Seen' : 'Delivered'}
                              </span>
                              {log.opened && log.openedAt && !isNaN(new Date(log.openedAt).getTime()) && (
                                <span className="text-[7px] text-white/20 font-mono italic">
                                  {new Date(log.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            
                            {log.replyCount ? (
                              <div className="flex items-center gap-2 px-2 py-0.5 bg-white/5 rounded-full border border-white/5">
                                <div className="relative flex items-center">
                                  <span className="text-[9px]">💬</span>
                                  {log.hasUnread && (
                                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_4px_rgba(34,197,94,0.6)] animate-pulse" />
                                  )}
                                </div>
                                <span className="text-[8px] font-mono text-white/60">{log.replyCount}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // Thread View
                  <div className="flex flex-col gap-3 py-2">
                    {/* Original Message */}
                    <div className="relative group">
                      <div className="absolute top-2 left-4 z-10 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[8px] uppercase tracking-widest font-black text-white/80 border border-white/5">Original Dispatch</div>
                      
                      {activeNoteData ? (
                        <div className="rounded-sm overflow-hidden border border-white/10 shadow-2xl bg-black/40">
                          <div 
                            className="pointer-events-none select-none flex justify-center py-4 md:py-6"
                            style={{ 
                              background: activeNoteData.theme_bg
                            }}
                          >
                            <div 
                              className="scale-[0.7] sm:scale-100 origin-top"
                              dangerouslySetInnerHTML={{ __html: activeNoteData.noteHTML }} 
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/5 border border-white/5 rounded-sm p-8 italic text-[11px] text-white/60">
                           <div dangerouslySetInnerHTML={{ __html: logs.find(l => l.noteId === activeLogThread)?.content || '' }} />
                           <div className="mt-2 pt-2 border-t border-white/5 text-[9px] opacity-40 uppercase tracking-widest font-bold">Fetching transmission history...</div>
                        </div>
                      )}

                      <div className="mt-1 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded-sm ${logs.find(l => l.noteId === activeLogThread)?.opened ? 'text-green-400' : 'text-blue-400'}`}>
                            ● {logs.find(l => l.noteId === activeLogThread)?.opened ? 'Seen' : 'Delivered'}
                          </span>
                          {logs.find(l => l.noteId === activeLogThread)?.openedAt && !isNaN(new Date(logs.find(l => l.noteId === activeLogThread)!.openedAt!).getTime()) && (
                            <span className="text-[7px] text-white/20 font-mono italic">
                              at {new Date(logs.find(l => l.noteId === activeLogThread)!.openedAt!).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center relative h-3">
                      <div className="w-[1px] h-full bg-gradient-to-b from-white/10 to-transparent" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1a1a1a] px-1 py-0.5 text-[#b89e7a] opacity-30 animate-bounce text-[8px]">↓</div>
                    </div>

                    {/* Replies */}
                    <div className="flex flex-col gap-2">
                      {(replies[activeLogThread] || []).length === 0 ? (
                        <div className="text-center py-6 opacity-20 italic text-xs">Awaiting anonymous response...</div>
                      ) : (
                        replies[activeLogThread].map((reply: any) => {
                          const replyTimeRaw = reply.timestamp;
                          const replyTime = typeof replyTimeRaw === 'number' 
                            ? replyTimeRaw 
                            : (replyTimeRaw?.seconds ? replyTimeRaw.seconds * 1000 : new Date(replyTimeRaw).getTime());
                          
                          // Mark as read in Firestore if needed
                          if (!reply.read) {
                            fetch('/api/mark-reply-read', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                noteId: activeLogThread,
                                replyId: reply.id
                              })
                            }).catch(err => console.error("Failed to mark read", err));
                          }
                          
                          return (
                            <div key={reply.id} className="bg-[#b89e7a]/5 border border-[#b89e7a]/10 rounded-sm p-6 relative group transition-all hover:bg-[#b89e7a]/10">
                              <div className="absolute -top-3 left-4 bg-[#1a1a1a] px-2 text-[8px] uppercase tracking-widest font-black text-[#b89e7a]">💬 Response Received</div>
                              <p className="text-[12px] leading-relaxed text-white/90 font-serif mb-4">"{reply.message}"</p>
                              <div 
                                className="text-[9px] text-[#b89e7a]/40 font-mono tracking-widest uppercase text-right cursor-pointer hover:text-[#b89e7a] transition-colors select-none"
                                onClick={() => setShowFullTime(prev => ({...prev, [reply.id]: !prev[reply.id]}))}
                              >
                                {showFullTime[reply.id] 
                                  ? new Date(replyTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                  : getRelativeTime(replyTime)
                                }
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 text-center">
                <p className="text-[8px] uppercase tracking-[0.3em] font-bold text-white/20">Archived on local memory</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-12 mt-auto flex flex-col items-center gap-6 border-t border-white/5 opacity-40">
          <div className="flex flex-col items-center gap-2">
            <p className="text-[9px] uppercase tracking-[0.5em] text-[#b89e7a] font-medium text-center px-4 leading-relaxed">
              ANONYMOUS & SECURE<br />
              NO TRACE • NO IDENTITY • NO SIGN
            </p>
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

      {/* Responsibility Protocol Modal */}
      <AnimatePresence>
        {showRulesOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-md bg-[#1a1a1a] border border-[#b89e7a]/30 p-8 flex flex-col gap-6 relative shadow-[0_0_50px_rgba(184,158,122,0.1)]"
            >
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="w-10 h-10 border border-[#b89e7a] flex items-center justify-center text-[#b89e7a] text-xl font-serif-elegant">N</div>
                <h2 className="text-[#b89e7a] font-serif-elegant text-xl tracking-[0.2em] uppercase">Responsibility Protocol</h2>
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#b89e7a]/30 to-transparent" />
              </div>

              <div className="flex flex-col gap-4 text-[11px] text-white/70 leading-relaxed font-mono max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-1">
                  <p className="text-[#b89e7a]/60 font-black uppercase tracking-widest text-[9px] mb-2 sticky top-0 bg-[#1a1a1a] py-1">Safety & Behavior</p>
                  <p>• No <span className="text-[#b89e7a] font-bold underline decoration-[#b89e7a]/30 underline-offset-2">harassment</span>, bullying, or threats</p>
                  <p>• No <span className="text-[#b89e7a] font-bold underline decoration-[#b89e7a]/30 underline-offset-2">hate speech</span> or targeting based on identity</p>
                  <p>• No <span className="text-[#b89e7a] font-bold underline decoration-[#b89e7a]/30 underline-offset-2">sexually explicit</span> or inappropriate content</p>
                  <p>• No encouragement of <span className="text-[#b89e7a] font-bold underline decoration-[#b89e7a]/30 underline-offset-2">self-harm</span> or violence</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[#b89e7a]/60 font-black uppercase tracking-widest text-[9px] mb-2 sticky top-0 bg-[#1a1a1a] py-1">Privacy & Misuse</p>
                  <p>• Do not share <span className="text-[#b89e7a] font-bold underline decoration-[#b89e7a]/30 underline-offset-2">personal information</span> (yours or others’)</p>
                  <p>• Do not <span className="text-[#b89e7a] font-bold underline decoration-[#b89e7a]/30 underline-offset-2">impersonate</span> someone else</p>
                  <p>• Do not use this to <span className="text-[#b89e7a] font-bold underline decoration-[#b89e7a]/30 underline-offset-2">spam</span> or scam</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[#b89e7a]/60 font-black uppercase tracking-widest text-[9px] mb-2 sticky top-0 bg-[#1a1a1a] py-1">Accountability</p>
                  <p>• Messages may be <span className="text-[#b89e7a] font-bold underline decoration-[#b89e7a]/30 underline-offset-2">filtered</span> for abuse prevention</p>
                  <p>• Violations can lead to <span className="text-[#b89e7a] font-bold underline decoration-[#b89e7a]/30 underline-offset-2">restriction</span> or blocking</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 relative w-4 h-4 shrink-0">
                    <input 
                      type="checkbox" 
                      checked={agreedToRules} 
                      onChange={e => setAgreedToRules(e.target.checked)}
                      className="peer appearance-none w-4 h-4 rounded-none bg-black border border-[#b89e7a]/50 checked:bg-[#b89e7a] focus:ring-0 transition-all cursor-pointer absolute inset-0"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 pointer-events-none text-black">
                      <Check size={10} strokeWidth={4} />
                    </div>
                  </div>
                  <span className="text-[10px] text-white/50 group-hover:text-white/80 transition-colors uppercase tracking-wider font-bold">
                    I agree to use NoNameNote responsibly and follow the rules.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 relative w-4 h-4 shrink-0">
                    <input 
                      type="checkbox" 
                      checked={understoodResponsibility} 
                      onChange={e => setUnderstoodResponsibility(e.target.checked)}
                      className="peer appearance-none w-4 h-4 rounded-none bg-black border border-[#b89e7a]/50 checked:bg-[#b89e7a] focus:ring-0 transition-all cursor-pointer absolute inset-0"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 pointer-events-none text-black">
                      <Check size={10} strokeWidth={4} />
                    </div>
                  </div>
                  <span className="text-[10px] text-white/50 group-hover:text-white/80 transition-colors uppercase tracking-wider font-bold">
                    I understand this is anonymous, but I am responsible for what I send.
                  </span>
                </label>
              </div>

              <button 
                onClick={handleAcceptRules}
                disabled={!agreedToRules || !understoodResponsibility}
                className={`mt-4 py-4 w-full font-black uppercase tracking-[0.3em] text-[10px] transition-all
                  ${agreedToRules && understoodResponsibility 
                    ? 'bg-[#b89e7a] text-black hover:bg-[#c9bda4] shadow-lg' 
                    : 'bg-white/5 text-white/20 cursor-not-allowed'}
                `}
              >
                PROCEED
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
