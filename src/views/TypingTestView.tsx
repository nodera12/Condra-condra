import React, { useState, useEffect, useRef } from 'react';
import {
  Keyboard,
  RotateCcw,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Timer,
  Sparkles,
  Zap,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../lib/api.ts';
import { TypingScore } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface TypingTestViewProps {
  onBack?: () => void;
}

const PASSAGES = [
  'Creativity is intelligence having fun. On the Mr Felix video platform, visual artists, cinematographers, and storytellers capture raw fleeting moments of human expression. Every short film carries rhythm, emotion, and sound that connects communities across continents without barriers.',
  'The digital horizon expands when dedicated creators combine technology with artistic courage. In Lagos, Tokyo, London, and New York, high-definition cameras document nocturnal streets, ocean breakers, and culinary rituals. The speed of light delivers these stories straight to our hands.',
  'Typing with precision requires steady focus and rhythm, much like playing an acoustic instrument or editing the final cut of a cinematic masterpiece. Keep your fingers hovering over home row keys, breathe naturally, and watch words materialize with smooth momentum.',
  'A true master of craft understands that repetition brings clarity. As timestamps tick downward, accurate keystrokes produce harmonious lines of code, poetic prose, and timeless visual narratives that leave enduring marks on modern digital culture.',
];

const DURATION_OPTIONS = [
  { label: '15 seconds', seconds: 15 },
  { label: '30 seconds', seconds: 30 },
  { label: '60 seconds', seconds: 60 },
  { label: '2 minutes', seconds: 120 },
  { label: '5 minutes', seconds: 300 },
];

export const TypingTestView: React.FC<TypingTestViewProps> = () => {
  const { user, isAuthenticated } = useAuth();

  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [passage, setPassage] = useState<string>(PASSAGES[0]);
  const [userInput, setUserInput] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [isTestActive, setIsTestActive] = useState<boolean>(false);
  const [isTestComplete, setIsTestComplete] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<TypingScore[]>([]);

  // Calculated metrics
  const [finalMetrics, setFinalMetrics] = useState<{
    wordsTyped: number;
    correctWords: number;
    incorrectWords: number;
    accuracy: number;
    wpm: number;
    timeUsed: number;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const loadLeaderboard = async () => {
    try {
      const data = await api.getTypingLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      // Ignore
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  // Reset test state
  const resetTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setUserInput('');
    setTimeRemaining(selectedDuration);
    setIsTestActive(false);
    setIsTestComplete(false);
    setFinalMetrics(null);
    // Pick a random passage
    const randomPassage = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
    setPassage(randomPassage);
    setTimeout(() => {
      inputAreaRef.current?.focus();
    }, 100);
  };

  // Switch duration
  const handleSelectDuration = (seconds: number) => {
    if (isTestActive) return;
    setSelectedDuration(seconds);
    setTimeRemaining(seconds);
    resetTest();
  };

  // Start test on first keystroke
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isTestComplete) return;

    const val = e.target.value;

    if (!isTestActive && val.length > 0) {
      setIsTestActive(true);
      startTimer();
    }

    setUserInput(val);

    // If user finishes passage before time runs out
    if (val.length >= passage.length) {
      finishTest(selectedDuration - timeRemaining, val);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          finishTest(selectedDuration);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finishTest = async (timeUsedSeconds?: number, textOverride?: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTestActive(false);
    setIsTestComplete(true);

    const actualTimeUsed = timeUsedSeconds || selectedDuration;
    const typedText = textOverride !== undefined ? textOverride : userInput;

    // Calculate metrics
    const passageWords = passage.trim().split(/\s+/);
    const typedWords = typedText.trim().split(/\s+/).filter(Boolean);

    let correctWordsCount = 0;
    let incorrectWordsCount = 0;

    typedWords.forEach((word, idx) => {
      if (idx < passageWords.length && word === passageWords[idx]) {
        correctWordsCount++;
      } else {
        incorrectWordsCount++;
      }
    });

    const totalWords = typedWords.length;
    const accuracy = totalWords > 0 ? Math.round((correctWordsCount / totalWords) * 1000) / 10 : 0;
    const minutes = Math.max(actualTimeUsed, 1) / 60;
    const wpm = Math.round(correctWordsCount / minutes);

    const metrics = {
      wordsTyped: totalWords,
      correctWords: correctWordsCount,
      incorrectWords: incorrectWordsCount,
      accuracy,
      wpm,
      timeUsed: actualTimeUsed,
    };

    setFinalMetrics(metrics);

    // Trigger celebration if high performance
    if (accuracy >= 80 && wpm > 30) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#6366f1'],
        });
      } catch (err) {}
    }

    // Save score to database
    try {
      await api.saveTypingScore({
        durationSeconds: selectedDuration,
        wordsTyped: totalWords,
        correctWords: correctWordsCount,
        incorrectWords: incorrectWordsCount,
        accuracy,
        wpm,
        timeUsed: actualTimeUsed,
        guestName: user ? undefined : 'Guest Typist',
      });
      loadLeaderboard();
    } catch (err) {
      console.error('Failed to save score:', err);
    }
  };

  // Render passage with character-by-character color highlighting
  const renderPassageWithHighlights = () => {
    return passage.split('').map((char, index) => {
      let colorClass = 'text-neutral-500';
      if (index < userInput.length) {
        if (userInput[index] === char) {
          colorClass = 'text-emerald-400 font-medium bg-emerald-950/30 rounded-xs';
        } else {
          colorClass = 'text-red-400 font-bold bg-red-950/50 underline rounded-xs';
        }
      } else if (index === userInput.length) {
        colorClass = 'text-amber-300 border-b-2 border-amber-400 animate-pulse';
      }

      return (
        <span key={index} className={colorClass}>
          {char}
        </span>
      );
    });
  };

  return (
    <div
      id="typing-test-page"
      className="min-h-[calc(100vh-3.5rem)] pb-20 pt-4 px-4 max-w-3xl mx-auto text-neutral-100 animate-in fade-in"
    >
      {/* Page Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-white font-['Outfit',sans-serif] flex items-center gap-2">
            Typing Speed Test
            <Keyboard className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs text-neutral-400">Test your typing velocity, accuracy, and words per minute</p>
        </div>

        {/* Live Timer Countdown */}
        <div
          id="typing-timer-display"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-amber-500/30 text-amber-400 font-mono font-bold text-sm shadow-md"
        >
          <Timer className="w-4 h-4" />
          <div>
            <span className="text-[10px] uppercase text-neutral-400 block -mb-1">TIME REMAINING</span>
            <span className="text-base font-black tracking-wider text-amber-400">{timeRemaining}s</span>
          </div>
        </div>
      </div>

      {/* Duration Selector Tabs */}
      <div className="mb-5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
          Select Duration:
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.seconds}
              id={`duration-btn-${opt.seconds}`}
              disabled={isTestActive}
              onClick={() => handleSelectDuration(opt.seconds)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedDuration === opt.seconds
                  ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 disabled:opacity-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Stage */}
      {!isTestComplete ? (
        <div className="space-y-4">
          {/* Passage Box with Character Highlighting */}
          <div
            id="passage-display-box"
            className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl font-['JetBrains_Mono',monospace] text-sm sm:text-base leading-relaxed tracking-normal select-none"
          >
            {renderPassageWithHighlights()}
          </div>

          {/* Typing Input Area */}
          <div className="relative">
            <textarea
              ref={inputAreaRef}
              id="typing-input-area"
              rows={3}
              disabled={isTestComplete}
              placeholder={isTestActive ? '' : 'Start typing the words above to begin countdown...'}
              value={userInput}
              onChange={handleInputChange}
              className="w-full p-4 rounded-2xl bg-neutral-950 border-2 border-neutral-800 focus:border-amber-500 rounded-xl font-['JetBrains_Mono',monospace] text-sm text-white placeholder-neutral-500 focus:outline-none transition-all resize-none shadow-inner"
            />
            {!isTestActive && (
              <div className="absolute right-4 bottom-4 text-[11px] text-amber-400 font-medium flex items-center gap-1.5 pointer-events-none">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Timer starts automatically on keypress</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Results Screen as requested in prompt */
        <div
          id="typing-test-results-card"
          className="p-6 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 border-2 border-amber-500/40 shadow-2xl text-center animate-in zoom-in-95 duration-200"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Trophy className="w-7 h-7" />
          </div>

          <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 block mb-1">
            Performance Report
          </span>
          <h2 className="text-2xl font-black text-white font-['Outfit',sans-serif] tracking-tight mb-6">
            TYPING TEST COMPLETE
          </h2>

          {finalMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-w-lg mx-auto text-left font-['JetBrains_Mono',monospace]">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Words Typed</span>
                <span className="text-xl font-bold text-white">{finalMetrics.wordsTyped}</span>
              </div>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">Correct Words</span>
                <span className="text-xl font-bold text-emerald-400">{finalMetrics.correctWords}</span>
              </div>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-red-400 uppercase tracking-wider block">Incorrect Words</span>
                <span className="text-xl font-bold text-red-400">{finalMetrics.incorrectWords}</span>
              </div>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Accuracy</span>
                <span className="text-xl font-bold text-amber-300">{finalMetrics.accuracy}%</span>
              </div>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-amber-400 uppercase tracking-wider block">Speed</span>
                <span className="text-xl font-bold text-amber-400">{finalMetrics.wpm} WPM</span>
              </div>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Time Used</span>
                <span className="text-xl font-bold text-white">{finalMetrics.timeUsed} seconds</span>
              </div>
            </div>
          )}

          {/* TRY AGAIN button as explicitly mandated */}
          <button
            id="btn-try-again"
            onClick={resetTest}
            className="py-3 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 mx-auto shadow-xl shadow-amber-500/25 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}

      {/* Global Leaderboard Table */}
      <div className="mt-8 pt-6 border-t border-neutral-800/80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Hall of Fame Leaderboard
          </h3>
          <span className="text-[11px] text-neutral-500">Top WPM Scores</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 uppercase tracking-wider text-[10px] border-b border-neutral-800">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Typist</th>
                <th className="py-2.5 px-3 text-right">Speed</th>
                <th className="py-2.5 px-3 text-right">Accuracy</th>
                <th className="py-2.5 px-3 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 font-['JetBrains_Mono',monospace]">
              {leaderboard.map((item, idx) => (
                <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-2.5 px-3 text-neutral-500 font-bold">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-semibold text-white truncate max-w-[120px]">
                    @{item.username}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-amber-400">{item.wpm} WPM</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">{item.accuracy}%</td>
                  <td className="py-2.5 px-3 text-right text-neutral-400">{item.durationSeconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
