import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Send, Mail, CheckCircle2, AlertCircle, History, X, Check, Info,
  ChevronLeft, ChevronRight, Heading, Highlighter, Quote,
  Shield, Eye, MessageCircle, Lock, ArrowLeft, CheckCheck, ShieldCheck
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
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error text');
      console.warn('Moderation API failed:', response.status, errorText.slice(0, 100));
      return false; // Fail safe
    }

    const result = await response.json();
    return result.toxic || false;
  } catch (error) {
    console.error('Moderation Error:', error);
    return false; // Fail safe
  }
}
import confetti from 'canvas-confetti';
import { fetchWithRetry } from './lib/api';
import { Theme, THEMES, CHAR_LIMIT } from './types';

// Reply Item Component
const ReplyItem = ({ reply, getRelativeTime }: { reply: any, getRelativeTime: any }) => {
  const replyTimeRaw = reply.timestamp;
  const replyTime = typeof replyTimeRaw === 'number' 
    ? replyTimeRaw 
    : (replyTimeRaw?.seconds ? replyTimeRaw.seconds * 1000 : new Date(replyTimeRaw).getTime());

  return (
    <div className="relative">
       <div className="bg-[#1c1c1c] rounded-[14px] p-6 border border-[#d4a843]/20 shadow-[0_0_20px_rgba(212,168,67,0.08)] relative timeline-card">
          <span className="absolute top-4 left-4 text-[#d4a843]/20 text-6xl font-serif leading-none select-none italic">“</span>
          <p className="text-white font-mono text-sm leading-relaxed relative z-10 pt-4 break-words text-justify">{reply.message}</p>
          <div className="mt-4 text-right">
            <span className="text-[#666666] text-[10px] font-mono uppercase tracking-widest">
              {getRelativeTime(replyTime)}
            </span>
          </div>
       </div>
    </div>
  );
};

import { Logo } from './components/Logo';

export default function MainApp() {
  const [content, setContent] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>(THEMES[0]);
  const [activeTextColor, setActiveTextColor] = useState<string | null>(null);
  const [activeFormats, setActiveFormats] = useState<{ [key: string]: boolean }>({});
  const [highlighterMode, setHighlighterMode] = useState(false);
  const [highlighterManuallyDisabled, setHighlighterManuallyDisabled] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [nextAvailableTime, setNextAvailableTime] = useState<string>('');
  const [showLogs, setShowLogs] = useState(false);
  const [showRulesOverlay, setShowRulesOverlay] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [understoodResponsibility, setUnderstoodResponsibility] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ id: string; noteId?: string; recipient: string; content: string; timestamp: number; hasUnread?: boolean; replyCount?: number; opened?: boolean; openedAt?: number; isDraft?: boolean; themeId?: string; htmlContent?: string; }[]>([]);
  const [activeLogThread, setActiveLogThread] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DRAFT' | 'UNREAD' | 'SEEN' | 'DELIVERED'>('ALL');
  const [undoLog, setUndoLog] = useState<{ log: any; index: number } | null>(null);
  const [undoTimer, setUndoTimer] = useState<number>(0);
  const [activeNoteData, setActiveNoteData] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadedDraftContent, setLoadedDraftContent] = useState<string | null>(null);

  const hasActualText = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.innerText.replace(/\u200B/g, '').trim().length > 0;
  };

  // Auto-save unsent transmission
  useEffect(() => {
    const hasText = hasActualText(content);
    if (hasText) {
      const timeout = setTimeout(() => {
        localStorage.setItem('unsent_transmission', JSON.stringify({
          content,
          recipient,
          themeId: selectedTheme.id,
          timestamp: Date.now()
        }));
      }, 1000);
      return () => clearTimeout(timeout);
    } else {
      // If content is empty, we might want to clear the unsent draft if it exists
      // but maybe only if the recipient is also empty
      if (!recipient.trim()) {
        localStorage.removeItem('unsent_transmission');
      }
    }
  }, [content, recipient, selectedTheme]);

  useEffect(() => {
    if (showLogs) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [showLogs]);

  const handleDeleteLog = (id: string) => {
    const logIndex = logs.findIndex(l => (l.id === id || l.noteId === id));
    if (logIndex === -1) return;

    const logToDelete = logs[logIndex];
    const newLogs = logs.filter(l => (l.id !== id && l.noteId !== id));
    
    setLogs(newLogs);
    localStorage.setItem('sentNotesLog', JSON.stringify(newLogs));
    
    setUndoLog({ log: logToDelete, index: logIndex });
    setUndoTimer(5);
  };

  useEffect(() => {
    let interval: any;
    if (undoTimer > 0) {
      interval = setInterval(() => {
        setUndoTimer(prev => prev - 1);
      }, 1000);
    } else {
      setUndoLog(null);
    }
    return () => clearInterval(interval);
  }, [undoTimer]);

  const handleUndoDelete = () => {
    if (undoLog) {
      const newLogs = [...logs];
      newLogs.splice(undoLog.index, 0, undoLog.log);
      setLogs(newLogs);
      localStorage.setItem('sentNotesLog', JSON.stringify(newLogs));
      setUndoLog(null);
      setUndoTimer(0);
    }
  };
  const [showFullTime, setShowFullTime] = useState<{[key: string]: boolean}>({});
  const [replies, setReplies] = useState<{ [noteId: string]: any[] }>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSendAnimation, setShowSendAnimation] = useState(false);
  const [isOverlayFadingOut, setIsOverlayFadingOut] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const themeScrollRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Force browser to use divs for new lines, ensuring proper block separation for alignment
    document.execCommand('defaultParagraphSeparator', false, 'div');

    const initApp = async () => {
      try {
        setLoading(true);
        const rulesAccepted = localStorage.getItem('rulesAccepted');
        if (!rulesAccepted) {
          setShowRulesOverlay(true);
        }
        const savedLogs = localStorage.getItem('sentNotesLog');
        if (savedLogs) {
          try {
            const parsed = JSON.parse(savedLogs);
            const uniqueLogs = Array.isArray(parsed) ? parsed.filter((log, index, self) => 
              log && index === self.findIndex((t) => t && ((t.id && t.id === log.id) || (t.noteId && t.noteId === log.noteId)))
            ) : [];
            setLogs(uniqueLogs);
            checkAllReplies(uniqueLogs).catch(err => console.error("Archive status check failed:", err));
          } catch (e) {
            console.error("Failed to parse logs", e);
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to initialize application");
      } finally {
        setLoading(false);
      }
    };
    
    initApp();

    // Check for auto-saved unsent transmission
    const checkUnsent = () => {
      const unsent = localStorage.getItem('unsent_transmission');
      if (unsent) {
        try {
          const parsed = JSON.parse(unsent);
          // If editor is empty, ask to restore or just restore if it's recent (e.g. within 1 hour)
          // For simplicity and user experience, we'll just restore if the current editor is truly empty
          const isEditorEmpty = !content.trim() || content === '<br>';
          if (isEditorEmpty && (Date.now() - parsed.timestamp < 3600000)) {
            setRecipient(parsed.recipient || '');
            const theme = THEMES.find(t => t.id === parsed.themeId) || THEMES[0];
            setSelectedTheme(theme);
            if (editorRef.current) {
              editorRef.current.innerHTML = parsed.content || '';
              setContent(parsed.content || '');
            }
          }
        } catch (e) {
          console.error("Failed to parse unsent transmission", e);
        }
      }
    };
    checkUnsent();

    return () => {
    };
  }, []);

  const handleAcceptRules = () => {
    localStorage.setItem('rulesAccepted', 'true');
    setShowRulesOverlay(false);
  };

  const handleDeleteTransmission = () => {
    if (!activeLogThread) return;
    const updated = logs.filter(l => l.noteId !== activeLogThread);
    setLogs(updated);
    localStorage.setItem('sentNotesLog', JSON.stringify(updated));
    setActiveLogThread(null);
    setActiveNoteData(null);
    setShowDeleteConfirm(false);
    setShowLogs(false);
  };

  useEffect(() => {
    if (!showLogs || !activeLogThread) return;

    // Direct fetch helper for active thread replies
    const refreshActiveReplies = async () => {
      try {
        setIsSyncing(true);
        const res = await fetch('/api/get-replies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ noteId: activeLogThread })
        });
        if (res.ok) {
          const { replies: repliesData } = await res.json();
          setReplies(prev => ({ ...prev, [activeLogThread]: repliesData || [] }));
        }
      } catch (e: any) {
        if (e?.message?.includes('Failed to fetch')) {
          console.warn("Poll replies interrupt:", e.message);
        } else {
          console.error("Failed to poll replies", e);
        }
      } finally {
        // Subtle delay for the sync indicator to feel meaningful
        setTimeout(() => setIsSyncing(false), 800);
      }
    };

    // Initial refresh when opening thread
    refreshActiveReplies().catch(err => console.error("Archive status check failed:", err));

    // Poll every 10 seconds while thread is active
    const interval = setInterval(() => {
      refreshActiveReplies().catch(err => console.error("Archive status check failed:", err));
    }, 10000);
    return () => clearInterval(interval);
  }, [showLogs, activeLogThread]);

  const checkAllReplies = async (currentLogs: any[]) => {
    if (!currentLogs.length) return;
    
    // Process active first, then others in parallel
    const updatedLogs = [...currentLogs];
    const activeIdx = activeLogThread ? updatedLogs.findIndex(l => l.noteId === activeLogThread) : -1;
    
    const checkLog = async (idx: number) => {
      const log = updatedLogs[idx];
      if (!log?.noteId) return null;
      
      try {
        const response = await fetch('/api/get-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ noteId: log.noteId, markSeen: false })
        });
        if (!response.ok) return null;
        
        const { note } = await response.json();
        if (note) {
          const isOpened = !!note.opened;
          const openedAtValue = note.openedAt ? new Date(note.openedAt).getTime() : null;
          
          let logChanged = false;
          let entry = { ...updatedLogs[idx] };

          if (log.opened !== isOpened || log.openedAt !== openedAtValue) {
            entry = { ...entry, opened: isOpened, openedAt: openedAtValue };
            logChanged = true;
          }

          // Fetch replies if active
          if (log.noteId === activeLogThread) {
            const repliesRes = await fetch('/api/get-replies', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ noteId: log.noteId })
            });
            if (repliesRes.ok) {
              const { replies: repliesData } = await repliesRes.json();
              setReplies(prev => ({ ...prev, [log.noteId!]: repliesData || [] }));
              
              const unreadCount = (repliesData || []).filter((r: any) => !r.read).length;
              if (log.hasUnread !== (unreadCount > 0) || log.replyCount !== repliesData?.length) {
                entry = { ...entry, hasUnread: unreadCount > 0, replyCount: repliesData?.length };
                logChanged = true;
              }
            }
          }
          
          if (logChanged) return { idx, entry };
        }
      } catch (e: any) {
        // Network failures during background sync should be warnings, not errors
        if (e?.message?.includes('Failed to fetch')) {
          console.warn("Status check network interrupt:", e.message);
        } else {
          console.error("Status check failed", e);
        }
      }
      return null;
    };

    // If active thread exists, check it immediately
    if (activeIdx !== -1) {
      const result = await checkLog(activeIdx);
      if (result) {
        updatedLogs[result.idx] = result.entry;
        setLogs([...updatedLogs]);
      }
    }

    // Process remainder in parallel batches of 5 to avoid overwhelming the browser
    const remainingIndices = updatedLogs.map((_, i) => i).filter(i => i !== activeIdx);
    for (let i = 0; i < remainingIndices.length; i += 5) {
      const batch = remainingIndices.slice(i, i + 5);
      const results = await Promise.all(batch.map(idx => checkLog(idx)));
      
      let batchChanged = false;
      results.forEach(res => {
        if (res) {
          updatedLogs[res.idx] = res.entry;
          batchChanged = true;
        }
      });
      
      if (batchChanged) {
        setLogs([...updatedLogs]);
        localStorage.setItem('sentNotesLog', JSON.stringify(updatedLogs));
      }
    }
  };

  const saveToLogs = (recipient: string, contentHTML: string, noteId?: string) => {
    const newLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      noteId,
      recipient,
      content: contentHTML.substring(0, 500), // Safety limit for storage
      timestamp: Date.now()
    };
    
    setLogs(prev => {
      // Deduplicate by noteId if provided
      const existingIndex = noteId ? prev.findIndex(l => l.noteId === noteId) : -1;
      let updated;
      if (existingIndex !== -1 && noteId) {
        updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...newLog, id: prev[existingIndex].id }; // Keep original ID
      } else {
        updated = [newLog, ...prev];
      }
      
      const slice = updated.slice(0, 50);
      localStorage.setItem('sentNotesLog', JSON.stringify(slice));
      return slice;
    });
  };
  const rgbToHex = (rgb: string) => {
    if (!rgb || rgb === 'inherit' || rgb === 'transparent') return null;
    if (rgb.startsWith('#')) return rgb.toLowerCase();
    const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*(?:\.\d+)?))?\)$/);
    if (!match) return rgb.toLowerCase();
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toLowerCase();
    return hex;
  };

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
    let currentColor: string | null = null;
    
    // Improved Heading Detection
    const blockValue = document.queryCommandValue('formatBlock')?.toLowerCase();
    let inH2Context = blockValue === 'h2' || blockValue === 'heading 2';
    let inBlockquoteContext = blockValue === 'blockquote';

    if (selection && selection.rangeCount > 0) {
      let node = selection.anchorNode;
      
      // Try to get foreColor from document
      const colorValue = document.queryCommandValue('foreColor');
      if (colorValue && colorValue !== 'inherit') {
        const hex = rgbToHex(colorValue);
        // We only care if it's NOT the theme's default text color
        if (hex !== rgbToHex(selectedTheme.defaultTextColor || '#ffffff')) {
          currentColor = hex;
        }
      }

      let tempNode = node;
      while (tempNode && tempNode !== editorRef.current) {
        if (tempNode instanceof HTMLElement) {
          const name = tempNode.nodeName.toUpperCase();
          if (name === 'H2') inH2Context = true;
          if (name === 'BLOCKQUOTE') inBlockquoteContext = true;
          if (tempNode.classList.contains('highlighter') || (tempNode.style && tempNode.style.backgroundColor !== '')) {
            inHighlighterContext = true;
          }
          // If we haven't found a color yet, check the style
          if (!currentColor && tempNode.style && tempNode.style.color) {
            const hex = rgbToHex(tempNode.style.color);
            if (hex !== rgbToHex(selectedTheme.defaultTextColor || '#ffffff')) {
              currentColor = hex;
            }
          }
        }
        tempNode = tempNode.parentNode;
      }
    }

    formats.highlighter = inHighlighterContext;
    formats.h2 = inH2Context;
    formats.blockquote = inBlockquoteContext;

    setActiveFormats(formats);
    
    // Tracking active text color
    if (currentColor) {
      setActiveTextColor(currentColor);
    } else {
      // If we are on empty editor, don't reset if we have a state
      if (editorRef.current && editorRef.current.innerText.replace(/\u200B/g, '').trim().length > 0) {
        setActiveTextColor(null);
      }
    }

    if (selection && selection.isCollapsed) {
      if (inHighlighterContext) {
        if (!highlighterManuallyDisabled) {
          setHighlighterMode(true);
        }
      } else {
        setHighlighterMode(false);
        setHighlighterManuallyDisabled(false);
      }
    }
    return { ...formats, highlighter: inHighlighterContext };
  }, [highlighterManuallyDisabled, selectedTheme.defaultTextColor]);

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

  const handleInput = (forcedColor?: string | null) => {
    if (editorRef.current) {
      const text = editorRef.current.innerText.replace(/\u200B/g, '');
      const innerHTML = editorRef.current.innerHTML;

      if (text.length > CHAR_LIMIT) {
        // Find the cursor position
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        const offset = range?.startOffset || 0;
        
        // Revert to limited text
        editorRef.current.innerText = text.substring(0, CHAR_LIMIT);
        
        // Restore cursor position if possible
        if (selection && range && editorRef.current.firstChild) {
          try {
            const newRange = document.createRange();
            newRange.setStart(editorRef.current.firstChild, Math.min(offset, CHAR_LIMIT));
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } catch(e) {}
        }
      }
      
      const cleanText = editorRef.current.innerText.replace(/\u200B/g, '').replace(/[\n\r]+$/, '');
      
      if (cleanText.length === 0) {
        const selection = window.getSelection();
        // Use the forced color if provided, otherwise the current state
        let hasFormatting = !!(forcedColor !== undefined ? forcedColor : activeTextColor);
        
        // Search for parent formatting tags
        if (selection && selection.rangeCount > 0) {
          let node = selection.anchorNode;
          while (node && node !== editorRef.current) {
            if (node instanceof HTMLElement) {
              const name = node.nodeName.toUpperCase();
              if (['H2', 'BLOCKQUOTE', 'B', 'I', 'U', 'S', 'STRIKE'].includes(name) || node.classList.contains('highlighter') || (node.style && node.style.backgroundColor)) {
                hasFormatting = true;
                break;
              }
            }
            node = node.parentNode;
          }
          
          if (!hasFormatting) {
            hasFormatting = document.queryCommandState('bold') || 
                            document.queryCommandState('italic') || 
                            document.queryCommandState('underline');
          }
        }

        // More restrictive reset for Heading/Blockquote detection
        const blockValue = document.queryCommandValue('formatBlock')?.toLowerCase();
        const isInBlock = blockValue === 'h2' || blockValue === 'blockquote' || blockValue === 'heading 2';
        if (isInBlock) hasFormatting = true;

        if (!hasFormatting && forcedColor === undefined) {
          setActiveTextColor(null);
          setHighlighterMode(false);
          setHighlighterManuallyDisabled(false);
        }
        
        // Only reset innerHTML if it's truly devoid of any structural formatting
        const inner = editorRef.current.innerHTML.toLowerCase();
        // If we have a blockquote or h2, it's not trivial to reset
        const hasStructuralElements = inner.includes('<blockquote') || inner.includes('<h2');
        const isTrivial = (inner === '' || inner === '<br>' || inner === '<div><br></div>' || inner === '<p><br></p>' || inner === '<div></div>') && !hasStructuralElements;
        
        if (isTrivial && !hasFormatting) {
          editorRef.current.innerHTML = '<div><br></div>';
          if (selection) {
            const range = document.createRange();
            if (editorRef.current.firstChild) {
              range.setStart(editorRef.current.firstChild, 0);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      } else {
        const highlighterSpans = editorRef.current.querySelectorAll('.highlighter');
        highlighterSpans.forEach(span => {
          if (span.textContent?.replace(/\u200B/g, '').length === 0) {
            span.remove();
          }
        });
      }
      setContent(editorRef.current.innerHTML);
      updateActiveFormats();
    }
  };

  useEffect(() => {
    setActiveTextColor(null);
  }, [selectedTheme]);

  const handleSaveDraft = () => {
    const hasText = hasActualText(content);
    if (!hasText) return;

    const draftLog = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipient,
      content: editorRef.current?.innerText.substring(0, 500) || '',
      htmlContent: content,
      timestamp: Date.now(),
      isDraft: true,
      themeId: selectedTheme.id
    };

    setLogs(prev => {
      const updated = [draftLog, ...prev];
      const slice = updated.slice(0, 100); // Allow more for drafts
      localStorage.setItem('sentNotesLog', JSON.stringify(slice));
      return slice;
    });

    setLoadedDraftContent(content);
    setStatus({ type: 'success', message: 'Transmission draft saved locally.' });
    setTimeout(() => setStatus({ type: null, message: '' }), 3000);
  };

  const loadDraft = (log: any) => {
    setRecipient(log.recipient || '');
    const theme = THEMES.find(t => t.id === log.themeId) || THEMES[0];
    setSelectedTheme(theme);
    setLoadedDraftContent(log.htmlContent || '');
    
    if (editorRef.current) {
      editorRef.current.innerHTML = log.htmlContent || '';
      setContent(log.htmlContent || '');
      // Focus the editor
      setTimeout(() => {
        editorRef.current?.focus();
        // Move cursor to end
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editorRef.current!);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }, 0);
    }
    
    setShowLogs(false);
    setActiveLogThread(null);
    setStatus({ type: 'success', message: 'Draft loaded into editor.' });
    setTimeout(() => setStatus({ type: null, message: '' }), 3000);
  };

  const execCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    
    let forcedColor: string | null | undefined = undefined;

    if (command === 'formatBlock') {
      const curValue = document.queryCommandValue('formatBlock').toLowerCase();
      // If we are already in the target block type (e.g. h2), toggle back to a default block (p or div)
      const isTargetActive = value === 'h2' ? (curValue === 'h2' || activeFormats.h2) : (curValue === value || (value === 'blockquote' && activeFormats.blockquote));
      const toggleTo = isTargetActive ? 'div' : value;
      document.execCommand('formatBlock', false, toggleTo);
    } else if (command === 'foreColor') {
      if (activeTextColor === value) {
        document.execCommand('foreColor', false, selectedTheme.defaultTextColor || '#ffffff');
        forcedColor = null;
        setActiveTextColor(null);
      } else {
        document.execCommand('foreColor', false, value);
        forcedColor = value || null;
        setActiveTextColor(value || null);
      }
    } else {
      document.execCommand(command, false, value);
    }
    
    handleInput(forcedColor);
    updateActiveFormats();
  };

  const toggleHighlighter = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const highlightColor = `${selectedTheme.accentColor}44`;
    
    // Check if we are currently inside a highlighter span
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
      // Toggle OFF: If selection is collapsed inside or spans it, remove the highlighting
      if (selection.isCollapsed) {
        // Just move out of it or unwrap it if it's empty
        const text = highlighterSpan.innerText.replace(/\u200B/g, '');
        if (text.length === 0) {
          highlighterSpan.remove();
        } else {
          // If it has text, we just "stop" highlighting for new text by placing cursor after it
          const newRange = document.createRange();
          newRange.setStartAfter(highlighterSpan);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          // Insert a zero-width space to "break" out of the span's formatting if needed
          const zwsp = document.createTextNode('\u200B');
          newRange.insertNode(zwsp);
          newRange.setStartAfter(zwsp);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } else {
        // Unwrap the selected text from highlighter
        const text = highlighterSpan.innerText;
        highlighterSpan.replaceWith(document.createTextNode(text));
      }
      setHighlighterMode(false);
      setHighlighterManuallyDisabled(true);
    } else {
      // Toggle ON
      if (selection.isCollapsed) {
        // Create a new empty highlighter span and put cursor inside
        const span = document.createElement('span');
        span.className = 'highlighter';
        span.style.backgroundColor = highlightColor;
        span.innerHTML = '&#8203;'; // Zero width space
        range.insertNode(span);
        
        const newRange = document.createRange();
        newRange.setStart(span.firstChild!, 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        setHighlighterMode(true);
        setHighlighterManuallyDisabled(false);
      } else {
        // Wrap selection in highlighter span
        const span = document.createElement('span');
        span.className = 'highlighter';
        span.style.backgroundColor = highlightColor;
        span.appendChild(range.extractContents());
        range.insertNode(span);
        
        setHighlighterMode(true);
        setHighlighterManuallyDisabled(false);
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
    if (status.type === 'error' && status.message?.includes('Next note available in:')) {
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
        message: "⚠️ Your message was flagged for harmful content and cannot be sent.\nNONAMENOTE does not allow abusive, threatening or inappropriate messages." 
      });
      setIsSending(false);
      return;
    }

    try {
      setStatus({ type: null, message: 'Encryption in progress: Securing transmission...' });
      const noteCard = document.getElementById('note-card');
      const noteHTML = noteCard?.outerHTML || "";
      
      console.log('Step 2: Saving to Firebase...');
      const saveResponse = await fetchWithRetry('/api/save-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          noteHTML,
          theme_bg: selectedTheme.bgClass || "#0d0d0d",
          timestamp: Date.now()
        })
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        const errorText = !Object.keys(errorData).length ? await saveResponse.text().catch(() => 'Unknown Error') : '';
        console.error('API Error (Save Note):', saveResponse.status, errorData, errorText);
        throw new Error(errorData.message || errorData.error || `Server returned ${saveResponse.status}: ${errorText.slice(0, 100)}`);
      }

      const saveData = await saveResponse.json();
      const { noteId } = saveData;

      setStatus({ type: null, message: 'Routing: Dispatching secure link...' });
      const noteLink = window.location.origin + '/note-viewer/' + noteId;

      console.log('Step 3: Sending email...');
      try {
        const emailResponse = await fetchWithRetry('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_email: recipient.trim(),
            note_link: noteLink
          })
        });

        if (!emailResponse.ok) {
          const emailErrorData = await emailResponse.json().catch(() => ({}));
          throw new Error(emailErrorData.message || emailErrorData.error || 'Failed to send email via server');
        }
      } catch (emailError: any) {
        console.error('Email Service Error:', emailError);
        throw new Error(emailError?.message || 'Failed to dispatch email');
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
      localStorage.removeItem('unsent_transmission');
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

  const charCount = editorRef.current ? editorRef.current.innerText.replace(/\u200B/g, '').replace(/[\n\r]+$/, '').length : 0;

  if (loading) return (
    <div style={{
      background: '#0a0a0a',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ color: '#d4a843', fontFamily: 'monospace' }}>
        Loading transmission...
      </div>
    </div>
  );

  if (error) return (
    <div style={{
      background: '#0a0a0a',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#d4a843',
      fontFamily: 'monospace'
    }}>
      {error}
    </div>
  );

  return (
    <div className={`min-h-screen transition-all duration-700 ${selectedTheme?.bgClass ?? 'bg-[#0d0d0d]'} flex flex-col font-sans overflow-x-hidden w-full max-w-[100vw] box-border selection:bg-[#b89e7a]/40`}>
      <header className="pt-8 pb-4 w-full flex justify-center box-border overflow-hidden">
         <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 box-border overflow-hidden"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
              <Logo />
            </div>
            <div className="flex flex-col items-start leading-none">
              <h1 className="text-3xl font-serif-elegant tracking-[0.2em] text-[#b89e7a] uppercase font-light">
                NONAMENOTE
              </h1>
              <span className="text-[9px] text-[#b89e7a]/40 tracking-[0.15em] uppercase font-bold pl-0.5 mt-1 whitespace-nowrap">
                What you feel, not who you are.
              </span>
            </div>
          </div>
        </motion.div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-2 box-border overflow-hidden">
        <div className="flex justify-between px-2 mb-1">
          <div className="text-[10px] text-[#b89e7a]/40 font-mono tracking-widest uppercase py-1">
            DATE: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
          </div>
          <button 
            onClick={() => {
              try {
                setShowLogs(true);
              } catch (error) {
                console.error('Click handler error:', error);
              }
            }}
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
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { try { execCommand('formatBlock', 'h2'); } catch(e) { console.error(e); } }} className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats?.h2 ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Heading"><Heading size={18} /></button>
                <div className="h-4 w-[1px] bg-[#333] shrink-0 mx-1"></div>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { try { execCommand('bold'); } catch(e) { console.error(e); } }} className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats?.bold ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Bold"><Bold size={18} /></button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { try { execCommand('italic'); } catch(e) { console.error(e); } }} className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats?.italic ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Italic"><Italic size={18} /></button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { try { execCommand('underline'); } catch(e) { console.error(e); } }} className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats?.underline ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Underline"><Underline size={18} /></button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { try { toggleHighlighter(); } catch(e) { console.error(e); } }} className={`p-2 transition-all rounded-sm flex-shrink-0 relative group ${highlighterMode ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Highlighter"><Highlighter size={18} /></button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { try { execCommand('formatBlock', 'blockquote'); } catch(e) { console.error(e); } }} className={`p-2 transition-all rounded-sm flex-shrink-0 ${activeFormats?.blockquote ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`} title="Quote"><Quote size={18} fill={activeFormats?.blockquote ? "#b89e7a" : "none"} /></button>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 md:px-6 bg-[#151515] overflow-x-hidden">
              <div className="flex items-center justify-between w-full gap-2 overflow-x-auto scrollbar-hide">
                  <div className="flex items-center gap-1 shrink-0">
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { try { execCommand('justifyLeft'); } catch(e) { console.error(e); } }} className={`p-1.5 transition-all rounded-sm ${activeFormats?.justifyLeft ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`}><AlignLeft size={18} /></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { try { execCommand('justifyCenter'); } catch(e) { console.error(e); } }} className={`p-1.5 transition-all rounded-sm ${activeFormats?.justifyCenter ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`}><AlignCenter size={18} /></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { try { execCommand('justifyRight'); } catch(e) { console.error(e); } }} className={`p-1.5 transition-all rounded-sm ${activeFormats?.justifyRight ? 'text-[#b89e7a] bg-white/10' : 'text-white/40 hover:text-white/80'}`}><AlignRight size={18} /></button>
                  </div>
                <div className="h-4 w-[1px] bg-[#333] shrink-0"></div>
                <div className="flex gap-2.5 p-1 bg-black/40 rounded-sm border border-white/5 overflow-x-auto scrollbar-hide flex-1 justify-between px-2">
                  {['#ffffff', '#000000', '#b89e7a', '#ff4d4d', '#4dff4d', '#4d4dff', '#ffff4d'].map((color, idx) => (
                    <button key={`palette-${color}-${idx}`} onMouseDown={(e) => { e.preventDefault(); execCommand('foreColor', color); }} className={`w-4 h-4 rounded-sm hover:scale-110 active:scale-95 transition-all shadow-[0_0_5px_rgba(0,0,0,0.5)] border shrink-0 ${activeTextColor === color ? 'border-white scale-110 ring-1 ring-[#b89e7a]' : 'border-white/10'}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            <motion.div id="note-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`min-h-[500px] p-10 md:p-16 relative flex flex-col transition-all duration-1000 rounded-b-sm ${selectedTheme.paperClass} ${selectedTheme.fontClass}`}>
              <div ref={editorRef} contentEditable onKeyDown={(e) => { 
                // Prevent typing if limit reached
                if (charCount >= CHAR_LIMIT && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  return;
                }
                if (e.key === 'Enter') {
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    let temp = range.commonAncestorContainer as Node | null;
                    let quoteNode: HTMLElement | null = null;
                    while (temp && temp !== editorRef.current) {
                      if (temp.nodeName === 'BLOCKQUOTE') {
                        quoteNode = temp as HTMLElement;
                        break;
                      }
                      temp = temp.parentNode;
                    }

                    if (quoteNode) {
                      e.preventDefault();
                      
                      const container = range.startContainer;
                      const textContent = container.textContent || '';
                      
                      // Double Enter detection:
                      // If the current node (likely a text node or BR) is essentially empty
                      const isEmptyLine = textContent.replace(/\u200B/g, '').trim() === '' && 
                                          (container === quoteNode || container.parentNode === quoteNode);

                      if (isEmptyLine && quoteNode.innerText.replace(/\u200B/g, '').trim() === '') {
                        // Truly empty quote - exit it
                        const div = document.createElement('div');
                        div.innerHTML = '<br>';
                        quoteNode.parentNode?.replaceChild(div, quoteNode);
                        
                        const newRange = document.createRange();
                        newRange.setStart(div, 0);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                        handleInput();
                        setTimeout(updateActiveFormats, 0);
                        return;
                      }
                      
                      // If we are at an empty line within the quote (double enter check)
                      if (isEmptyLine) {
                         // Exit quote by moving to next line
                         const div = document.createElement('div');
                         div.innerHTML = '<br>';
                         
                         // If there's text after the cursor, we shouldn't exit just like that, but here we assume end of quote
                         if (quoteNode.nextSibling) {
                           quoteNode.parentNode?.insertBefore(div, quoteNode.nextSibling);
                         } else {
                           quoteNode.parentNode?.appendChild(div);
                         }
                         
                         const newRange = document.createRange();
                         newRange.setStart(div, 0);
                         newRange.collapse(true);
                         selection.removeAllRanges();
                         selection.addRange(newRange);
                         handleInput();
                         setTimeout(updateActiveFormats, 0);
                         return;
                      }

                      // Normal Enter: Insert a line break and stay in quote
                      document.execCommand('insertHTML', false, '<br>\u200B');
                      setTimeout(() => {
                        handleInput();
                        updateActiveFormats();
                      }, 0);
                      return;
                    } else {
                      setTimeout(() => {
                        handleInput();
                        updateActiveFormats();
                      }, 0);
                    }
                  }
                }

                if (e.key === 'Backspace') {
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    let container = range.commonAncestorContainer;
                    
                    // Traverse up to see if we are in a blockquote
                    let quoteNode: HTMLElement | null = null;
                    let temp = container as Node | null;
                    while (temp && temp !== editorRef.current) {
                      if (temp.nodeName === 'BLOCKQUOTE') {
                        quoteNode = temp as HTMLElement;
                        break;
                      }
                      temp = temp.parentNode;
                    }

                    if (quoteNode) {
                      // Check if cursor is at the very beginning of the blockquote
                      const rangeToStart = document.createRange();
                      rangeToStart.setStart(quoteNode, 0);
                      rangeToStart.setEnd(range.startContainer, range.startOffset);
                      
                      const contentAtStart = rangeToStart.toString().replace(/\u200B/g, '');
                      const totalContent = quoteNode.innerText.replace(/\u200B/g, '').trim();

                      // Only "untoggle" if the selection is collapsed AND at the beginning or the quote is empty
                      if (range.collapsed && (contentAtStart === '' || totalContent === '')) {
                        e.preventDefault();
                        if (totalContent === '') {
                           const div = document.createElement('div');
                           div.innerHTML = '<br>';
                           quoteNode.parentNode?.replaceChild(div, quoteNode);
                           const newRange = document.createRange();
                           newRange.setStart(div, 0);
                           newRange.collapse(true);
                           selection.removeAllRanges();
                           selection.addRange(newRange);
                        } else {
                           document.execCommand('formatBlock', false, 'div');
                        }
                        setTimeout(updateActiveFormats, 0);
                        return;
                      }
                    }
                  }
                }
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Enter'].includes(e.key)) {
                  setTimeout(updateActiveFormats, 0);
                }
              }} 
              onInput={() => handleInput()}
              className={`flex-1 outline-none text-xl md:text-2xl leading-relaxed whitespace-pre-wrap ${selectedTheme.fontClass} min-h-[350px] empty:before:content-[attr(data-placeholder)] empty:before:opacity-20`} data-placeholder="Compose your secure transmission here..." />
              <div className="mt-8 flex justify-between items-end relative">
                <div className="flex flex-col items-start translate-y-1">
                  <div className="char-count text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-300" style={{ color: charCount > CHAR_LIMIT ? '#ef4444' : selectedTheme.accentColor }}>
                    <span className="opacity-100">{charCount}</span>
                    <span className="opacity-100 ml-1">/ {CHAR_LIMIT}</span>
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
              {(THEMES || []).map((theme, i) => (
                <button key={`theme-select-${theme?.id || i}-${i}`} onClick={() => { try { setSelectedTheme(theme); } catch(e) { console.error(e); } }} className={`flex-shrink-0 w-24 h-14 rounded-md transition-all border snap-start flex items-center justify-center p-1 relative overflow-hidden group ${selectedTheme?.id === theme?.id ? 'border-[#b89e7a] scale-105 shadow-xl z-10' : 'border-[#333] opacity-60 hover:opacity-100 hover:border-[#555]'} ${theme?.bgClass ?? ''}`}>
                  <div className={`w-full h-full rounded-sm flex items-center justify-center text-[8px] uppercase font-black text-center leading-tight transition-all ${theme?.paperClass ?? ''} ${theme?.fontClass ?? ''} border-0 shadow-none`}><span className="relative z-50">{theme?.name?.replace(' ', '\n') ?? 'Theme'}</span></div>
                 </button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 mt-4 items-center">
          <div className="w-full grid grid-cols-1 gap-3">
            <button 
              onClick={handleSaveDraft}
              disabled={isSending || !hasActualText(content) || content === loadedDraftContent}
              className={`w-full font-bold py-3 uppercase tracking-[0.2em] text-[10px] bg-white/5 text-white/60 hover:bg-white/10 transition-all border border-white/10 rounded-sm active:scale-[0.98] ${(!hasActualText(content) || content === loadedDraftContent) ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              SAVE AS DRAFT
            </button>
            <button 
              ref={sendButtonRef} 
              onClick={() => handleSend('link')} 
              disabled={isSending || charCount > CHAR_LIMIT || !!nextAvailableTime} 
              className={`w-full font-black py-5 uppercase tracking-[0.3em] text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden rounded-sm
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
          </div>
          
          {nextAvailableTime && (
            <div className="flex items-center gap-2 text-[#b89e7a]/40 font-bold text-[9px] uppercase tracking-[0.2em] animate-pulse">
              <span className="w-1.5 h-1.5 bg-[#b89e7a]/20 rounded-full" />
              Next dispatch available in: {nextAvailableTime}
            </div>
          )}
        </section>
          <AnimatePresence>
            {status.type && (
              <motion.div key={`status-message-${status.type}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 border text-[11px] uppercase tracking-[0.1em] font-bold flex items-center gap-3 ${status.type === 'success' ? 'bg-green-500/5 text-green-400 border-green-500/20' : 'bg-red-500/5 text-red-400 border-red-500/20'}`}>
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
            key="logs-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
            onClick={() => {
              try {
                setShowLogs(false); 
                setActiveLogThread(null);
              } catch (error) {
                console.error('Click handler error:', error);
              }
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full ${activeLogThread ? 'max-w-2xl' : 'max-w-lg'} bg-[#0a0a0a] border border-white/10 px-0 sm:px-5 py-8 flex flex-col gap-6 max-h-[90vh] overflow-hidden relative transition-all duration-300 rounded-[24px] shadow-[#d4a84310]/30 shadow-2xl box-border mx-auto`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-6 px-5 sm:px-8">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      if (activeLogThread) {
                        setActiveLogThread(null);
                        setActiveNoteData(null);
                      } else {
                        setShowLogs(false);
                      }
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[#b89e7a] hover:bg-[#1a1a1a] transition-colors -ml-3"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <div className="flex flex-col">
                    <h3 className="text-white font-bold leading-tight text-[18px] text-left" style={{ fontFamily: 'Arial, sans-serif' }}>
                      {activeLogThread ? 'Transmission Thread' : 'Transmission Logs'}
                    </h3>
                    <p className="text-[8px] text-[#b89e7a] uppercase tracking-[0.4em] font-medium mt-1 text-left">
                      {activeLogThread ? 'VIEW LOGS & RESPONSES' : 'ARCHIVED DISPATCHES'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar py-8 relative">
                {!activeLogThread ? (
                  // List View
                  <>
                    <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide py-1 px-5 sm:px-8">
                      {['ALL', 'DRAFT', 'UNREAD', 'SEEN', 'DELIVERED'].map((f) => (
                        <button 
                          key={`filter-${f}`}
                          onClick={() => setActiveFilter(f as any)}
                          className={`text-[8px] font-black uppercase tracking-[0.2em] px-4 py-2 transition-all border shrink-0 rounded-lg ${activeFilter === f ? 'bg-[#b89e7a] text-black border-[#b89e7a] shadow-lg shadow-[#b89e7a]/20' : 'text-white/40 border-white/10 hover:border-white/30 hover:text-white/60 bg-white/5'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    {(() => {
                      const filteredLogs = logs.filter(log => {
                        if (activeFilter === 'ALL') return true;
                        if (activeFilter === 'DRAFT') return log.isDraft;
                        if (activeFilter === 'UNREAD') return !log.isDraft && log.hasUnread;
                        if (activeFilter === 'SEEN') return !log.isDraft && log.opened;
                        if (activeFilter === 'DELIVERED') return !log.isDraft && !log.opened;
                        return true;
                      });

                      return filteredLogs.length === 0 ? (
                        <div className="py-20 text-center text-white/60 italic text-sm tracking-wider">No transmissions in this category...</div>
                      ) : (
                        <div className="flex flex-col gap-6 px-5 sm:px-8">
                            {filteredLogs.map((log, idx) => (
                              <div key={`log-container-${log.id || log.noteId || idx}`} className="relative overflow-hidden">
                                {/* Delete Background Indicator */}
                                <div className="absolute inset-0 bg-red-900/40 flex items-center justify-end px-6 rounded-sm">
                                  <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Delete</span>
                                </div>
                                
                                <motion.div 
                                  key={`archived-log-${log.id || log.noteId || `idx-${idx}`}`}
                                  drag="x"
                                  dragDirectionLock
                                  dragConstraints={{ left: -120, right: 0 }}
                                  dragElastic={0.1}
                                  onDragEnd={(_, info) => {
                                    if (info.offset.x < -80) {
                                      handleDeleteLog(log.id || log.noteId || "");
                                    }
                                  }}
                                  onClick={async () => {
                                  try {
                                    if (log.isDraft) {
                                      loadDraft(log);
                                      return;
                                    }
                                    if (log?.noteId) {
                                      // Immediately set basic data to reveal UI instantly
                                      setActiveNoteData({
                                        noteHTML: log.content || '',
                                        timestamp: log.timestamp,
                                        opened: !!log.opened,
                                        openedAt: log.openedAt,
                                        recipient: log.recipient
                                      } as any);
                                      
                                      setActiveLogThread(log.noteId);
                                      
                                      // Local state update
                                      setLogs(prev => {
                                        const next = prev.map(l => l?.noteId === log.noteId ? { ...l, hasUnread: false } : l);
                                        localStorage.setItem('sentNotesLog', JSON.stringify(next));
                                        return next;
                                      });
        
                                      // Background fetch for freshest status and replies
                                      fetchWithRetry('/api/get-note', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ noteId: log.noteId, markSeen: false })
                                      }).then(res => {
                                        if (res?.ok) return res.json();
                                      }).then(data => {
                                        if (data?.note) {
                                          setActiveNoteData(data.note);
                                        }
                                      }).catch(err => console.error("Archive fetch error:", err));
                                    }
                                  } catch (error) {
                                    console.error('Click handler error:', error);
                                  }
                                }}
                                className={`group border-b border-white/5 pb-4 pt-2 cursor-pointer bg-[#121212] transition-colors px-2 rounded-sm relative z-10 ${log.hasUnread ? 'bg-red-500/[0.03]' : ''}`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className={`text-[10px] font-black tracking-wider break-all ${log.isDraft ? 'text-white/40' : 'text-[#b89e7a]'}`}>
                                    {log.isDraft ? '[DRAFT]' : ''} {log.recipient || 'No Recipient'}
                                  </span>
                                  <span className="text-[8px] text-white/20 font-mono flex-shrink-0">
                                    {!isNaN(new Date(log.timestamp).getTime()) ? new Date(log.timestamp).toLocaleDateString() : 'unknown'}
                                  </span>
                                </div>
                                
                                <div 
                                  className="text-[11px] text-white/40 truncate italic pr-4 mb-2"
                                  dangerouslySetInnerHTML={{ 
                                    __html: (log.content || '').replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '$1').replace(/<[^>]+>/g, ' ') 
                                  }}
                                />

                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {log.isDraft ? (
                                      <span className="text-[7px] font-black tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-xs bg-white/5 text-white/40">Local Draft</span>
                                    ) : (
                                      <>
                                        <span className={`text-[7px] font-black tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-xs ${log.opened ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                          {log.opened ? 'Seen' : 'Delivered'}
                                        </span>
                                        {log.opened && log.openedAt && !isNaN(new Date(log.openedAt).getTime()) && (
                                          <span className="text-[7px] text-white/20 font-mono italic">
                                            {new Date(log.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  
                                  {!log.isDraft && log.replyCount ? (
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
                              </motion.div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  // Thread View
                  <div className="w-full h-full p-0 m-0 overflow-x-visible box-border relative">
                    {(() => {
                      const isSeen = activeNoteData?.opened;
                      const statusColor = isSeen ? '#4caf50' : '#2196f3';
                      const statusGlow = isSeen ? 'rgba(76,175,80,0.2)' : 'rgba(33,150,243,0.2)';
                      
                      return (
                        <>
                          <div className="flex flex-row items-start w-full overflow-visible box-border px-5 sm:px-8">
                            {/* Right Column: Cards and Content */}
                            <div className="flex-1 min-w-0 pl-[48px] flex flex-col gap-0 overflow-visible box-border relative pb-10">
                            {/* Card 1: Original Dispatch */}
                              <div className="mb-[24px] w-full box-border overflow-visible relative">
                                {/* Segmented Line Part 1: Yellow line from dispatch downwards, transitioning to status color */}
                                <div className="absolute left-[-32px] top-8 bottom-[-24px] w-[1px]" 
                                  style={{ background: `linear-gradient(to bottom, #d4a843 0%, #d4a843 60%, ${statusColor} 100%)` }} 
                                />
                                
                                {/* Icon 1: Paper Plane in front of notch */}
                                <div className="absolute left-[-32px] top-8 -translate-x-1/2 -translate-y-1/2 z-20">
                                  <div className="w-8 h-8 rounded-full bg-[#0a0a0a] border border-[#d4a843] flex items-center justify-center text-[#d4a843] shadow-[0_0_20px_rgba(212,168,67,0.15)] shrink-0">
                                    <Send size={14} />
                                  </div>
                                </div>

                                <div className="bg-[#1c1c1c] rounded-[14px] p-6 border border-[#d4a843]/20 shadow-[0_0_20px_rgba(212,168,67,0.08)] w-full box-border timeline-card">
                                   <div className="text-white font-mono text-sm leading-relaxed mb-6 break-words whitespace-pre-wrap text-justify">
                                    {activeNoteData?.noteHTML ? (
                                      String(activeNoteData.noteHTML)
                                        .replace(/<[^>]+>/g, ' ')
                                        .replace(/Dispatch No\.[^]*?\d{2}-\d{3}-[A-Z]/gi, '')
                                        .replace(/Date:[^]*?\d{2}\s[A-Z][a-z]+\s\d{4}/gi, '')
                                        .replace(/\d+\s*\/\s*\d{3,4}/g, '') 
                                        .replace(/\s+/g, ' ')
                                        .trim()
                                    ) : (activeNoteData ? "Content processing..." : "Awaiting dispatch...")}
                                   </div>
                                   <div className="flex justify-end items-center text-[10px] font-mono">
                                     <span className="text-[#666666]">
                                       {activeNoteData?.timestamp ? (
                                         <>
                                           <span>{new Date(activeNoteData.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                           <span className="mx-2 opacity-30">|</span>
                                           <span>{new Date(activeNoteData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                         </>
                                       ) : ''}
                                     </span>
                                   </div>
                                </div>
                              </div>

                              {/* Status Label Row: Aligned with Status Icon */}
                              <div className="h-8 flex items-center mb-[24px] w-full box-border overflow-visible relative">
                                {/* Segmented Line Part 2: Status color line through status icon */}
                                <div className="absolute left-[-32px] top-0 bottom-[-24px] w-[1px]" style={{ backgroundColor: statusColor }} />

                                {/* Icon 2: Eye icon in front of seen text */}
                                <div className="absolute left-[-32px] top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                  <div className="w-8 h-8 rounded-full bg-[#0a0a0a] border flex items-center justify-center transition-all duration-700 shrink-0"
                                    style={{ 
                                      borderColor: statusColor,
                                      color: statusColor,
                                      boxShadow: `0 0 20px ${statusGlow}`
                                    }}
                                  >
                                    {isSeen ? <Eye size={15} /> : <CheckCheck size={15} />}
                                  </div>
                                </div>

                                <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-widest truncate" style={{ color: statusColor ?? '#d4a843' }}>
                                  {isSeen ? 'Seen' : 'Delivered'}
                                </span>
                                <span className="text-white/20 font-mono text-[9px] sm:text-[10px] ml-3 uppercase tracking-tighter shrink-0">
                                  {isSeen && activeNoteData?.openedAt ? 
                                    new Date(activeNoteData.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                                    activeNoteData?.timestamp ? new Date(activeNoteData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
                                  }
                                </span>
                              </div>

                              {/* Card 2: Response */}
                              <div className="mt-0 w-full box-border overflow-visible relative">
                                {/* Segmented Line Part 3: Transitions from status color back to yellow at the message bubble */}
                                <div className="absolute left-[-32px] top-0 bottom-[-32px] w-[1px]" 
                                  style={{ background: `linear-gradient(to bottom, ${statusColor} 0%, ${statusColor} 16px, #d4a843 32px, #d4a843 100%)` }} 
                                />
                                
                                {/* Icon 3: Message icon in front of response notch */}
                                <div className="absolute left-[-32px] top-8 -translate-x-1/2 -translate-y-1/2 z-20">
                                  <div className="w-8 h-8 rounded-full bg-[#0a0a0a] border border-[#d4a843] flex items-center justify-center text-[#d4a843] shadow-[0_0_20px_rgba(212,168,67,0.15)] shrink-0">
                                    <MessageCircle size={14} />
                                  </div>
                                </div>

                                {(replies?.[activeLogThread ?? ''] || []).length === 0 ? (
                                  <div className="bg-[#1c1c1c] rounded-[14px] p-6 border border-[#d4a843]/20 shadow-[0_0_20px_rgba(212,168,67,0.08)] w-full box-border timeline-card">
                                     <span className="text-[#666666] font-mono text-sm italic">Awaiting secure response...</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-6 w-full box-border">
                                    {(() => {
                                      const threadReplies = (replies?.[activeLogThread ?? ''] || []).filter(Boolean);
                                      const uniqueReplies = threadReplies.filter((r, i, s) => 
                                        s.findIndex(t => (t.id && t.id === r.id) || (String(t.timestamp) === String(r.timestamp) && t.message === r.message)) === i
                                      );
                                      
                                      return uniqueReplies.map((reply, ridx) => (
                                        <div key={`reply-item-${reply?.id || `idx-${ridx}`}`} className="w-full box-border">
                                          <ReplyItem 
                                            reply={reply} 
                                            getRelativeTime={getRelativeTime} 
                                          />
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>

                              {/* Footer card - Even wider and text fitting single line */}
                              <div className="mt-12 -ml-[48px] w-[calc(100%+48px)] box-border relative">
                                {/* The line touches the box top precisely at the thread alignment (16px from container left) */}
                                <div 
                                  className="absolute left-[16px] top-[-48px] h-[48px] w-[1px]" 
                                  style={{ background: 'linear-gradient(to bottom, #d4a843, #d4a843)' }}
                                />
                                <div className="bg-[#1c1c1c] rounded-[14px] py-5 px-6 flex items-center justify-between gap-4 border border-[#d4a843]/40 shadow-[0_0_30px_rgba(212,168,67,0.1)] relative w-full box-border overflow-hidden">
                                  <div className="flex items-center gap-4 min-w-0 flex-nowrap">
                                    <div className="w-12 h-12 flex-none flex items-center justify-center text-[#d4a843] bg-[#d4a843]/10 rounded-lg shrink-0">
                                      <ShieldCheck size={24} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-white font-serif text-sm md:text-[18px] font-medium tracking-tight leading-tight">Your identity is secured.</span>
                                      <span className="text-[10px] md:text-[11px] text-white/40 font-mono uppercase tracking-[0.2em] mt-1 max-w-[180px] leading-relaxed">Transmission Tunnel AES-256</span>
                                    </div>
                                  </div>
                                  
                                  {/* Status Indicator */}
                                  <div className="flex items-center gap-3 shrink-0 ml-auto">
                                    <span className="text-[11px] text-[#d4a843] font-mono uppercase tracking-widest hidden sm:inline">Active</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 text-center flex flex-col items-center gap-1 relative">
                {!activeLogThread && (
                  <div className="flex items-center gap-1.5 text-red-500/60 font-black uppercase tracking-[0.15em] text-[7px] mb-1">
                    <Info size={10} className="stroke-[3]" />
                    Swipe left to delete logs
                  </div>
                )}
                <p className="text-[8px] uppercase tracking-[0.3em] font-bold text-white/20">Archived on local memory</p>
              </div>

              <AnimatePresence>
                {undoLog && (
                  <motion.div 
                    key="undo-toast-logs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-40px)] max-w-xs"
                  >
                    <div className="bg-[#b89e7a] text-black px-4 py-3 rounded-sm flex items-center justify-between gap-4 shadow-2xl">
                      <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Deleted</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleUndoDelete(); }}
                        className="text-[9px] font-black uppercase tracking-widest bg-black text-white px-3 py-1.5 rounded-xs active:scale-95 transition-transform"
                      >
                        Undo {undoTimer}s
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Removed Delete Confirmation */}
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
                  <span key={`success-char-anim-${i}-${char}`} className="text-white font-telegraph text-sm md:text-xl tracking-[0.2em] font-bold uppercase transition-opacity" style={{ animation: 'letter-fade-in 0.2s forwards', animationDelay: `${3.2 + (i * 0.05)}s`, opacity: 0 }}>{char === " " ? "\u00A0" : char}</span>
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
            key="rules-protocol-overlay"
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
                    I agree to use NONAMENOTE responsibly and follow the rules.
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
