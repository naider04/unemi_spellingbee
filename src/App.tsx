/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Volume2, Settings, X, Check, Trophy, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WordListCategory, INITIAL_WORD_LISTS } from './constants';
import { analyzeSpelling, sounds } from './utils/gameUtils';

interface HistoryItem {
  id: string;
  word: string;
  guess: string;
  tip: string;
  coloredGuess: { char: string; correct: boolean }[];
  isCorrect: boolean;
}

export default function App() {
  // --- Settings State ---
  const [activeLists, setActiveLists] = useState<string[]>(() => {
    const saved = localStorage.getItem('bee_active_lists');
    return saved ? JSON.parse(saved) : [
      WordListCategory.BEGINNER,
      WordListCategory.INTERMEDIATE,
      WordListCategory.SENIOR,
      WordListCategory.MASTER
    ];
  });
  const [wordLists, setWordLists] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('bee_word_lists');
    if (saved) return JSON.parse(saved);
    return JSON.parse(JSON.stringify(INITIAL_WORD_LISTS));
  });
  const [repeatMistakes, setRepeatMistakes] = useState(() => {
    const saved = localStorage.getItem('bee_repeat_mistakes');
    return saved ? JSON.parse(saved) === true : true;
  });
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    return localStorage.getItem('bee_selected_voice') || 'Studio Recording';
  });

  // --- Game State ---
  const [currentWord, setCurrentWord] = useState('');
  const [userInput, setUserInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(() => {
    const saved = localStorage.getItem('bee_max_streak');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [editingList, setEditingList] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [isConfirmingRestore, setIsConfirmingRestore] = useState(false);
  const [logs, setLogs] = useState<{ id: string; message: string; timestamp: number }[]>(() => {
    const saved = localStorage.getItem('bee_test_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [showLogs, setShowLogs] = useState(false);

  // --- Metrics & Tower ---
  const [wordStartTime, setWordStartTime] = useState<number>(0);
  const [totalTime, setTotalTime] = useState(0);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [correctWords, setCorrectWords] = useState<string[]>([]);
  const [isFalling, setIsFalling] = useState(false);
  const lastProcessedWord = useRef<string>('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const voices = useRef<SpeechSynthesisVoice[]>([]);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('bee_active_lists', JSON.stringify(activeLists));
  }, [activeLists]);

  useEffect(() => {
    localStorage.setItem('bee_word_lists', JSON.stringify(wordLists));
  }, [wordLists]);

  useEffect(() => {
    localStorage.setItem('bee_selected_voice', selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showSaved) {
      timeout = setTimeout(() => setShowSaved(false), 1500);
    }
    return () => clearTimeout(timeout);
  }, [showSaved]);

  useEffect(() => {
    if (streak > maxStreak) {
      setMaxStreak(streak);
      localStorage.setItem('bee_max_streak', streak.toString());
    }
  }, [streak]);

  useEffect(() => {
    localStorage.setItem('bee_test_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    const loadVoices = () => {
      // Filter for US and UK English only
      const allVoices = window.speechSynthesis.getVoices();
      voices.current = allVoices.filter(v => 
        v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')
      );
      
      // If selectedVoice is null or not found in system voices, and isn't our custom one
      if (!selectedVoice || (selectedVoice !== 'Studio Recording' && !voices.current.some(v => v.name === selectedVoice))) {
        setSelectedVoice('Studio Recording');
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const addLog = React.useCallback((message: string) => {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      timestamp: Date.now()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 20));
  }, []);

  const handleToggleLogs = () => {
    const nextState = !showLogs;
    setShowLogs(nextState);
    addLog(`System: Log panel toggled ${nextState ? 'ON' : 'OFF'}`);
  };

  useEffect(() => {
    addLog(`System: Audio logging system ready. BASE_URL: "${import.meta.env.BASE_URL}"`);
  }, [addLog]);

  const handleCopyLogs = () => {
    const text = logs.map(log => `[${new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(text);
    addLog('System: Logs copied to clipboard.');
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();

    if (selectedVoice === 'Studio Recording') {
      const normalizedFileName = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      // Use BASE_URL to handle subpath deployments correctly
      const baseUrl = import.meta.env.BASE_URL || '/';
      const audioPath = `${baseUrl}/audio/${normalizedFileName}.mp3`.replace(/\/+/g, '/');
      
      const logMsg = `Attempting Studio Recording: "${text}" | Path: ${audioPath}`;
      console.log(`[Testing] ${logMsg}`);
      addLog(logMsg);

      const audio = new Audio(audioPath);
      
      const fallbackSpeak = (errorDetails?: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        const fallbackVoice = voices.current.find(v => v.lang.includes('en-US')) || voices.current[0];
        if (fallbackVoice) utterance.voice = fallbackVoice;
        
        const fallbackMsg = `Fallback triggered for "${text}" ${errorDetails ? `(Error: ${errorDetails})` : ""} | Source: Speech Synthesis (Voice: ${fallbackVoice?.name || 'Default'})`;
        console.log(`[Testing] ${fallbackMsg}`);
        addLog(fallbackMsg);
        window.speechSynthesis.speak(utterance);
      };

      // Diagnostic check with fetch to see if the path is reachable
      fetch(audioPath, { method: 'HEAD' })
        .then(res => {
          if (!res.ok) {
            addLog(`Diagnostic: Path ${audioPath} returned ${res.status}`);
          }
        })
        .catch(err => {
          addLog(`Diagnostic: Fetch error for ${audioPath}: ${err.message}`);
        });

      audio.play().catch((err) => {
        let errorInfo = 'Unknown Error';
        if (err instanceof Error) {
          errorInfo = err.message;
        } else if (audio.error) {
          // Check the HTMLMediaError code
          // 1: MEDIA_ERR_ABORTED, 2: MEDIA_ERR_NETWORK, 3: MEDIA_ERR_DECODE, 4: MEDIA_ERR_SRC_NOT_SUPPORTED
          errorInfo = `MediaError Code: ${audio.error.code}`;
        }
        console.warn(`Local audio failed for "${text}": ${errorInfo}`, err);
        fallbackSpeak(errorInfo);
      });

      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    let voiceName = 'Default';
    if (selectedVoice) {
      const voice = voices.current.find(v => v.name === selectedVoice);
      if (voice) {
        utterance.voice = voice;
        voiceName = voice.name;
      }
    }
    const logMsg = `Reproducing word: "${text}" | Source: Speech Synthesis (Voice: ${voiceName})`;
    console.log(`[Testing] ${logMsg}`);
    addLog(logMsg);
    window.speechSynthesis.speak(utterance);
  };

  // --- Game Mechanics ---
  const getNextWord = () => {
    const pool = activeLists.flatMap(list => wordLists[list] || []);
    if (pool.length === 0) return;
    
    let next;
    do {
      next = pool[Math.floor(Math.random() * pool.length)];
    } while (next === currentWord && pool.length > 1);
    
    setCurrentWord(next);
    setUserInput('');
    setWordStartTime(Date.now());
    setTimeout(() => {
      speak(next);
      inputRefs.current[0]?.focus();
    }, 200);
  };

  useEffect(() => {
    if (!currentWord && activeLists.length > 0) {
      getNextWord();
    }
  }, [activeLists]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim()) return;

    const normalizedGuess = userInput.trim().replace(/[^\w\s]|_/g, "").toLowerCase();
    const normalizedCorrect = currentWord.trim().replace(/[^\w\s]|_/g, "").toLowerCase();

    if (normalizedGuess === normalizedCorrect) {
      // Prevent double-processing if already handled (e.g. from rapid Enter key presses)
      if (lastProcessedWord.current === currentWord) return;
      lastProcessedWord.current = currentWord;

      const timeTaken = (Date.now() - wordStartTime) / 1000;
      setTotalTime(prev => prev + timeTaken);
      setCorrectTotal(prev => prev + 1);
      
      setStreak(prev => prev + 1);
      setCorrectWords(prev => {
        // Prevent duplicate consecutive entries of the same word (e.g. from double-submits)
        if (prev[0] === currentWord) return prev;
        return [currentWord, ...prev].slice(0, 50);
      });
      setIsFalling(false);
      
      await sounds.playCorrect();
      getNextWord();
    } else {
      setStreak(0);
      setIsFalling(true);
      setTimeout(() => {
        setIsFalling(false);
      }, 1000);

      const { tip, coloredGuess } = analyzeSpelling(userInput, currentWord);
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        word: currentWord,
        guess: userInput,
        tip,
        coloredGuess,
        isCorrect: false
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 50)); // Newest at top
      await sounds.playWrong();
      
      if (!repeatMistakes) {
        getNextWord();
      } else {
        setUserInput('');
        setWordStartTime(Date.now());
        speak(currentWord);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    }
  };

  // --- Global Key Listener ---
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (isMenuOpen || editingList || isVoiceMenuOpen) return;
      if (e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isMenuOpen, editingList, isVoiceMenuOpen, userInput, currentWord]);

  const visibleHistory = history.slice(0, showAllHistory ? 50 : 5);
  const avgSpeed = correctTotal > 0 ? (totalTime / correctTotal).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 select-none flex flex-col md:max-w-md mx-auto relative overflow-hidden text-sm">
      {/* Header */}
      <header className="bg-yellow-400 px-3 py-2 border-b-2 border-stone-800 flex justify-between items-center shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] z-40">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center border border-white">
            <span className="text-sm">🐝</span>
          </div>
          <h1 className="font-black text-xs uppercase italic leading-none">Spelling Bee<br/><span className="text-[10px] opacity-70">Competition</span></h1>
        </div>
        <div className="flex gap-1.5 relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 bg-white rounded-lg border-2 border-stone-800 shadow-[1px_1px_0px_0px_rgba(28,25,23,1)] active:shadow-none transition-all"
          >
            <Settings size={16} />
          </button>

          {/* Settings Popover */}
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-64 bg-white border-2 border-stone-800 shadow-[4px_4px_0px_0px_rgba(28,25,23,1)] rounded-xl p-3 z-50 flex flex-col gap-3"
                >
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Active Lists</h3>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.keys(wordLists).map(list => (
                        <button
                          key={list}
                          onClick={() => {
                            setActiveLists(prev => 
                              prev.includes(list) ? prev.filter(l => l !== list) : [...prev, list]
                            );
                          }}
                          className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border-2 transition-all ${
                            activeLists.includes(list) 
                            ? 'bg-yellow-400 border-stone-800' 
                            : 'bg-stone-50 border-stone-200 text-stone-400'
                          }`}
                        >
                          {list}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-stone-100">
                    <label className="flex items-center justify-between text-xs font-bold cursor-pointer hover:bg-stone-50 p-1 rounded">
                      <span>Repeat Mistakes</span>
                      <input 
                        type="checkbox" 
                        checked={repeatMistakes} 
                        onChange={(e) => setRepeatMistakes(e.target.checked)}
                        className="w-4 h-4 accent-yellow-400 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                    <button 
                      onClick={() => { setIsMenuOpen(false); setIsVoiceMenuOpen(true); }}
                      className="px-2 py-1.5 bg-stone-100 border-2 border-stone-800 text-[10px] font-black rounded-lg hover:bg-stone-200"
                    >
                      VOICES
                    </button>
                    <button 
                      onClick={() => { setIsMenuOpen(false); setEditingList(WordListCategory.BEGINNER); }}
                      className="px-2 py-1.5 bg-stone-100 border-2 border-stone-800 text-[10px] font-black rounded-lg hover:bg-stone-200"
                    >
                      EDIT LISTS
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-stone-200 text-[10px] font-bold uppercase">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div className="flex items-center gap-1">
            <Trophy size={11} className="text-yellow-600" />
            STREAK: <span className="text-yellow-600 font-black">{streak}</span>
          </div>
          <div className="flex items-center gap-1">
            MAX: <span className="text-stone-400">{maxStreak}</span>
          </div>
          <div className="flex items-center gap-1">
            AVG SPEED: <span className="text-stone-400 font-black">{avgSpeed}s</span>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <Check size={11} strokeWidth={3} className="shrink-0" />
            TOTAL: <span className="font-black">{correctTotal}</span>
          </div>
        </div>
      </div>

      {/* Correct Words Row */}
      <div className="px-3 py-1 bg-stone-100 border-b border-stone-200 overflow-hidden flex items-center gap-2">
        <span className="text-[9px] font-black text-stone-400 uppercase shrink-0">Recent:</span>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          <AnimatePresence>
            {correctWords.map((word, idx) => (
              <motion.span 
                key={`${word}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] font-bold text-green-600 whitespace-nowrap bg-white px-1.5 py-0.5 rounded border border-green-200 flex items-center gap-1 shadow-sm"
              >
                <Check size={10} strokeWidth={3} className="shrink-0" />
                {word}
              </motion.span>
            ))}
          </AnimatePresence>
          {correctWords.length === 0 && <span className="text-[10px] text-stone-300 italic">None yet...</span>}
        </div>
      </div>

      <main className="flex-1 p-3 flex flex-col gap-4 overflow-y-auto relative">
        {/* Action Controls - Moved to top */}
        <div className="flex flex-col gap-3 sticky top-0 bg-stone-50 z-10 pt-1 pb-4 border-b border-stone-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-center">
            <button 
              onClick={() => speak(currentWord)}
              className="w-12 h-12 bg-yellow-400 rounded-full border-2 border-stone-800 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(28,25,23,1)] active:translate-y-0.5 active:shadow-none transition-all"
            >
              <Volume2 size={24} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 min-h-[60px]">
            {Array.from({ length: userInput.length + 2 }).map((_, idx) => (
              <input
                key={`${idx}-${currentWord}`}
                ref={(el) => (inputRefs.current[idx] = el)}
                id={`char-${idx}-${currentWord}`}
                name={`char-box-${idx}`}
                type="text"
                maxLength={1}
                value={userInput[idx] || ''}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
                  if (!val) return;
                  
                  const newUserInput = userInput.split('');
                  newUserInput[idx] = val;
                  const joined = newUserInput.join('');
                  setUserInput(joined);
                  
                  // Focus next box
                  setTimeout(() => {
                    inputRefs.current[idx + 1]?.focus();
                  }, 10);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace') {
                    if (!userInput[idx] && idx > 0) {
                      const newUserInput = userInput.split('');
                      newUserInput[idx - 1] = '';
                      setUserInput(newUserInput.join(''));
                      inputRefs.current[idx - 1]?.focus();
                    } else {
                      const newUserInput = userInput.split('');
                      newUserInput[idx] = '';
                      setUserInput(newUserInput.join(''));
                    }
                  }
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                autoCapitalize="none"
                inputMode="text"
                className={`w-8 h-12 text-center text-xl font-black rounded-lg border-2 transition-all p-0 focus:outline-none uppercase ${
                  userInput.length === idx 
                    ? 'border-yellow-400 bg-yellow-50 shadow-[0px_0px_10px_rgba(250,204,21,0.2)]' 
                    : 'border-stone-800 bg-white'
                } ${userInput.length > idx ? 'bg-stone-50 border-stone-300' : ''} ${
                  idx === userInput.length ? 'opacity-60' : 
                  idx === userInput.length + 1 ? 'opacity-30' : 'opacity-100'
                }`}
                style={{ caretColor: 'transparent' }}
              />
            ))}
          </div>

          <button 
            onClick={() => handleSubmit()}
            className="w-full p-3 bg-stone-900 text-yellow-400 font-black text-lg rounded-xl shadow-[2px_2px_0px_0px_rgba(156,163,175,0.5)] hover:bg-stone-800 active:translate-y-1 active:shadow-none transition-all"
          >
            ENTER
          </button>
        </div>

        {/* History Stack - Most recent at top, moved below input */}
        <div className="flex-1 min-h-0">
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Recent Mistakes</h3>
            <AnimatePresence initial={false}>
              {visibleHistory.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl border bg-white border-stone-200 flex flex-col gap-1 shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <div className="font-bold uppercase flex gap-0.5 text-sm tracking-wide">
                      {item.coloredGuess.map((g, i) => (
                        <span key={i} className={g.correct ? 'text-stone-400' : 'text-red-600 underline decoration-2'}>
                          {g.char}
                        </span>
                      ))}
                    </div>
                    <div className="font-black text-xs flex items-center gap-1.5 px-2 py-0.5 bg-yellow-400 rounded-full border border-stone-800">
                      <Check size={10} className="text-stone-900" />
                      {item.word}
                    </div>
                  </div>
                  <p className="text-xs italic text-stone-500 font-medium">{item.tip}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {history.length > 5 && (
              <button 
                onClick={() => setShowAllHistory(!showAllHistory)}
                className="text-[10px] font-black text-stone-400 py-3 hover:text-stone-600 text-center uppercase tracking-widest"
              >
                {showAllHistory ? 'Show fewer' : `Show all ${history.length} mistakes`}
              </button>
            )}

            {history.length === 0 && (
              <div className="py-8 text-center border-2 border-dashed border-stone-100 rounded-2xl">
                <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">No mistakes yet! Keep it up 🐝</p>
              </div>
            )}
          </div>
        </div>

        {/* Test Logs Section */}
        <div className="mt-8 border-t-2 border-stone-100 pt-4 pb-8">
          <button 
            onClick={handleToggleLogs}
            className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest hover:text-stone-600 transition-colors"
          >
            <div className={`w-2 h-2 rounded-full ${logs.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-stone-300'}`} />
            Test Audio Logs {showLogs ? '(Hide)' : '(Show)'}
          </button>
          
          <AnimatePresence>
            {showLogs && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="bg-stone-900 rounded-xl p-3 font-mono text-[9px] text-stone-300 space-y-1.5 shadow-inner max-h-48 overflow-y-auto">
                  {logs.length > 0 ? (
                    logs.map(log => (
                      <div key={log.id} className="border-l-2 border-yellow-500/30 pl-2 py-0.5 leading-relaxed">
                        <span className="text-yellow-500/50">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span> {log.message}
                      </div>
                    ))
                  ) : (
                    <div className="italic text-stone-600">No logs generated yet. Play some audio!</div>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => setLogs([])}
                    className="text-[9px] font-bold text-red-400 hover:text-red-500 uppercase tracking-tighter"
                  >
                    Clear Logs
                  </button>
                  <button 
                    onClick={handleCopyLogs}
                    className="text-[9px] font-bold text-blue-400 hover:text-blue-500 uppercase tracking-tighter flex items-center gap-1"
                  >
                    <Copy size={10} /> Copy Logs
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Voice Selection Modal */}
      <AnimatePresence>
        {isVoiceMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl w-full max-w-sm border-2 border-stone-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
               <div className="p-3 bg-yellow-400 border-b-2 border-stone-800 flex justify-between items-center">
                <h3 className="font-bold uppercase text-xs">Select Voice</h3>
                <button onClick={() => setIsVoiceMenuOpen(false)}><X size={18}/></button>
              </div>
              <div className="p-3 max-h-[60vh] overflow-y-auto space-y-1">
                <button 
                  onClick={() => { setSelectedVoice('Studio Recording'); setIsVoiceMenuOpen(false); }}
                  className={`w-full text-left p-2.5 rounded-lg border-2 text-[10px] font-bold transition-all ${selectedVoice === 'Studio Recording' ? 'bg-yellow-100 border-yellow-400' : 'bg-stone-50 border-stone-100 hover:border-stone-400'}`}
                >
                  Studio Recording <span className="opacity-50 float-right">(Pre-recorded)</span>
                </button>
                <div className="h-px bg-stone-100 my-1" />
                {voices.current.map(v => (
                  <button 
                    key={v.name}
                    onClick={() => { setSelectedVoice(v.name); setIsVoiceMenuOpen(false); }}
                    className={`w-full text-left p-2.5 rounded-lg border-2 text-[10px] font-bold transition-all ${selectedVoice === v.name ? 'bg-yellow-100 border-yellow-400' : 'bg-stone-50 border-stone-100 hover:border-stone-400'}`}
                  >
                    {v.name} <span className="opacity-50 float-right">({v.lang})</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List Editor Modal */}
      <AnimatePresence>
        {editingList && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-h-[80vh] flex flex-col border-2 border-stone-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="p-3 bg-stone-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-xs uppercase tracking-tight">Lists Editor</h2>
                  <AnimatePresence>
                    {showSaved && (
                      <motion.span 
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] font-black text-green-400 uppercase"
                      >
                        • Saved
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={() => { setEditingList(null); setIsConfirmingRestore(false); }}><X size={20}/></button>
              </div>
              
              <div className="p-2 border-b border-stone-100 flex gap-1 overflow-x-auto bg-stone-50">
                {Object.keys(wordLists).map(list => (
                  <button 
                    key={list}
                    onClick={() => setEditingList(list)}
                    className={`px-3 py-1 text-[10px] font-black rounded-full border-2 transition-all whitespace-nowrap ${editingList === list ? 'bg-yellow-400 border-stone-800' : 'bg-white border-stone-200 text-stone-400'}`}
                  >
                    {list}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tight">Edit words below (one per line):</p>
                <textarea
                  value={(wordLists[editingList] || []).join('\n')}
                  onChange={(e) => {
                    const newWords = e.target.value.split('\n').map(w => w.trim()).filter(w => w !== '');
                    setWordLists(prev => ({ ...prev, [editingList!]: newWords }));
                    setShowSaved(true);
                  }}
                  className="flex-1 w-full p-4 border-2 border-stone-800 rounded-2xl font-bold text-sm focus:outline-none bg-stone-50 leading-relaxed shadow-inner"
                  spellCheck={false}
                  placeholder="Type words here..."
                />
              </div>

              <div className="p-3 border-t border-stone-100 bg-stone-50">
                  {!isConfirmingRestore ? (
                    <button 
                      onClick={() => setIsConfirmingRestore(true)}
                      className="w-full p-3 bg-white border-2 border-red-200 text-red-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-50 transition-all shadow-sm active:translate-y-0.5 active:shadow-none"
                    >
                      Restore Original Words
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-black text-red-600 text-center uppercase">Reset everything?</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => {
                            const fresh = JSON.parse(JSON.stringify(INITIAL_WORD_LISTS));
                            setWordLists(fresh);
                            setActiveLists([
                              WordListCategory.BEGINNER,
                              WordListCategory.INTERMEDIATE,
                              WordListCategory.SENIOR,
                              WordListCategory.MASTER
                            ]);
                            if (!fresh[editingList!]) setEditingList(WordListCategory.BEGINNER);
                            setShowSaved(true);
                            setIsConfirmingRestore(false);
                          }}
                          className="p-2.5 bg-red-600 text-white border-2 border-stone-800 rounded-lg text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5"
                        >
                          YES, RESET
                        </button>
                        <button 
                          onClick={() => setIsConfirmingRestore(false)}
                          className="p-2.5 bg-white text-stone-900 border-2 border-stone-800 rounded-lg text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

