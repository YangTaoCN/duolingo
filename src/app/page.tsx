"use client";

import { useState, useEffect, useRef, memo, useMemo } from 'react';
import data from '@/data/texts.json';

type AppStatus = 'idle' | 'running' | 'finished';

interface TextLineProps {
  lineText: string;
  typedText: string | null; // null if not the active line (past or future)
  isActive: boolean;
  isPast: boolean;
}

const TextLine = memo(({ lineText, typedText, isActive, isPast }: TextLineProps) => {
  if (isPast) {
    return (
      <div className="font-medium text-green-400 whitespace-pre-wrap break-words">
        {lineText}
      </div>
    );
  }

  if (!isActive || typedText === null) {
    return (
      <div className="font-medium text-neutral-500/50 whitespace-pre-wrap break-words">
        {lineText}
      </div>
    );
  }

  // Active state
  return (
    <div className="font-medium flex flex-col gap-2 bg-neutral-900/50 p-4 rounded-xl border border-neutral-700/50 -mx-4">
      {/* Reference Line */}
      <div className="text-white whitespace-pre-wrap break-words">
        {lineText}
      </div>
      {/* Input Line */}
      <div className="whitespace-pre-wrap break-words relative">
        {lineText.split('').map((char, index) => {
          const typedChar = typedText[index];
          let className = "opacity-0"; 
          let displayChar = char;

          if (typedChar !== undefined) {
            displayChar = typedChar;
            if (typedChar === char) {
              className = "text-green-400";
            } else {
              className = "text-red-400 bg-red-900/40 rounded-sm";
            }
          }

          return (
            <span key={index} className="relative">
              {index === typedText.length && (
                <span className="absolute left-0 top-0 border-l-2 border-white animate-pulse h-[1.1em] z-10"></span>
              )}
              <span className={className}>{displayChar}</span>
            </span>
          );
        })}
        {typedText.length === lineText.length && (
           <span className="relative">
             <span className="absolute left-0 top-0 border-l-2 border-white animate-pulse h-[1.1em] z-10"></span>
           </span>
        )}
      </div>
    </div>
  );
});
TextLine.displayName = 'TextLine';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const textOptions = useMemo(() => {
    if (!isMounted) return data;
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') || process.env.NODE_ENV === 'development';
    return isLocal 
      ? [{ id: 'test-localhost', title: '[DEV] 1-Word Test', difficulty: 'easy', lines: ['Test'], translations: ['测试'] }, ...data]
      : data;
  }, [isMounted]);

  const [selectedTextId, setSelectedTextId] = useState(data[0].id);
  const currentText = useMemo(() => textOptions.find(d => d.id === selectedTextId) || textOptions[0], [selectedTextId, textOptions]);

  const [status, setStatus] = useState<AppStatus>('idle');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [typedTextInCurrentLine, setTypedTextInCurrentLine] = useState('');
  
  // Stats
  const [totalCorrectChars, setTotalCorrectChars] = useState(0);
  const [totalTypedChars, setTotalTypedChars] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'running') {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - (startTime || Date.now())) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, startTime]);

  // Focus input on mount and clicks
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentText]);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset();
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (status === 'finished') return;

    const val = e.target.value;
    
    if (status === 'idle' && val.length > 0) {
      setStatus('running');
      setStartTime(Date.now());
    }

    const currentLineText = currentText.lines[currentLineIndex];
    
    // Prevent typing beyond the line length
    if (val.length > currentLineText.length) {
      return;
    }

    setTypedTextInCurrentLine(val);

    // Auto advance if line is completed
    if (val.length === currentLineText.length) {
      // Calculate correct chars for this line
      let correctInLine = 0;
      for (let i = 0; i < val.length; i++) {
        if (val[i] === currentLineText[i]) correctInLine++;
      }
      
      setTotalCorrectChars(prev => prev + correctInLine);
      setTotalTypedChars(prev => prev + val.length);
      
      if (currentLineIndex < currentText.lines.length - 1) {
        setCurrentLineIndex(prev => prev + 1);
        setTypedTextInCurrentLine('');
      } else {
        setStatus('finished');
      }
    }
  };

  // Prevent backspacing to previous lines
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && typedTextInCurrentLine.length === 0) {
      e.preventDefault();
    }
  };

  const reset = () => {
    setStatus('idle');
    setStartTime(null);
    setElapsedTime(0);
    setCurrentLineIndex(0);
    setTypedTextInCurrentLine('');
    setTotalCorrectChars(0);
    setTotalTypedChars(0);
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.focus();
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTextId(e.target.value);
    reset();
  };

  // Calculate current stats
  let currentCorrectInLine = 0;
  const currentLineText = currentText.lines[currentLineIndex];
  if (status !== 'idle' && typedTextInCurrentLine) {
    for (let i = 0; i < typedTextInCurrentLine.length; i++) {
      if (typedTextInCurrentLine[i] === currentLineText[i]) currentCorrectInLine++;
    }
  }

  const overallCorrect = totalCorrectChars + currentCorrectInLine;
  const overallTyped = totalTypedChars + typedTextInCurrentLine.length;

  const wpm = elapsedTime > 0 ? Math.round((overallCorrect / 5) / (elapsedTime / 60)) : 0;
  const accuracy = overallTyped > 0 ? Math.round((overallCorrect / overallTyped) * 100) : 100;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <main 
      className="min-h-screen bg-neutral-900 text-neutral-300 font-mono p-8 flex flex-col items-center select-none"
      onClick={handleContainerClick}
    >
      {/* Hidden input for capturing keystrokes */}
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 fixed top-1/2 left-1/2 w-1 h-1 pointer-events-none -z-50"
        value={typedTextInCurrentLine}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
      />

      <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
        <div className="flex flex-col gap-2 w-full md:w-auto z-20 relative">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Typing Practice</h1>
          </div>
          <select 
            value={selectedTextId}
            onChange={handleSelectChange}
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500/50 transition-all cursor-pointer"
          >
            {textOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ({item.difficulty})
              </option>
            ))}
          </select>
          <button 
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="text-sm text-neutral-400 hover:text-white transition-colors text-left"
          >
            Restart (Esc)
          </button>
        </div>

        <div className="flex gap-8 bg-neutral-800/80 px-6 py-4 rounded-xl shadow-lg border border-neutral-700/50 backdrop-blur-sm z-20 relative">
          <div className="flex flex-col items-center">
            <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">Time</span>
            <span className="text-2xl font-bold text-white tabular-nums">{formatTime(elapsedTime)}</span>
          </div>
          <div className="w-px bg-neutral-700"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">WPM</span>
            <span className="text-2xl font-bold text-white tabular-nums">{wpm}</span>
          </div>
          <div className="w-px bg-neutral-700"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">Accuracy</span>
            <span className="text-2xl font-bold text-white tabular-nums">{accuracy}%</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-neutral-800/40 p-10 md:p-14 rounded-2xl border border-neutral-700/50 shadow-2xl relative cursor-text">
        <div className="space-y-6 text-xl md:text-3xl leading-relaxed tracking-wide">
          {currentText.lines.map((line, index) => (
            <div key={`${selectedTextId}-${index}`} className="flex flex-col gap-1 mb-2">
              <TextLine
                lineText={line}
                typedText={index === currentLineIndex ? typedTextInCurrentLine : null}
                isActive={index === currentLineIndex}
                isPast={index < currentLineIndex}
              />
              {currentText.translations && currentText.translations[index] && (
                <div className="text-sm text-neutral-500 ml-1">{currentText.translations[index]}</div>
              )}
            </div>
          ))}
        </div>
        
        {status === 'finished' && (
          <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-30">
            <h2 className="text-4xl font-bold text-white mb-4">Practice Complete!</h2>
            <div className="flex gap-8 text-xl mb-8">
              <div>WPM: <span className="text-green-400 font-bold">{wpm}</span></div>
              <div>Accuracy: <span className="text-green-400 font-bold">{accuracy}%</span></div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-xl transition-colors"
            >
              Try Again
            </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const answer = window.prompt("前院的风");
                  if (answer === "后院的篝火") {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const seconds = String(now.getSeconds()).padStart(2, '0');
                    const timeStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                    
                    const recipient = 'yangtao.ch@gmail.com';
                    const subject = "报告老公大人！我今天的打字练习完成啦 🏆";
                    const body = `老公亲爱的~ 💖\n\n你看我今天超棒的，刚刚完成了一组打字练习，快来夸夸我！(求表扬 🥺✨)\n\n📝 练习内容：${currentText.title}\n⏰ 完成时间：${timeStr}\n⚡️ 打字速度：${wpm} WPM (手速飞快有没有！)\n🎯 准确率：${accuracy}% (我超认真的！)\n\n想要亲亲抱抱和奖励！🥰\n\n爱你的老婆`;
                    
                    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  } else if (answer !== null) {
                    alert("Incorrect Password");
                  }
                }}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-colors"
              >
                Report Score
              </button>
          </div>
        )}
      </div>
    </main>
  );
}
