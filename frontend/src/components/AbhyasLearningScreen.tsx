import {
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Lightbulb,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getAIEducation, getAIUsage, submitQuizCompletion } from '../lib/api';
import { AIResponseMeta, EducationData, QuizCompletionResponse } from '../lib/types';

interface AbhyasLearningScreenProps {
  onSelectSymbol?: (symbol: string) => void;
  onOpenChargesCalc?: () => void;
}

interface CategoryWorkspace {
  selectedTopic: string;
  customTopic: string;
  lesson: (EducationData & { quizId?: string }) | null;
  meta: AIResponseMeta | null;
  quizAnswers: Record<number, number>;
  quizResult: QuizCompletionResponse | null;
}

const LEVEL_TOPICS: Record<'beginner' | 'intermediate' | 'advanced', string[]> = {
  beginner: [
    'Market vs Limit vs SL-M Orders',
    'The 1% Account Risk Defense Rule',
    'Candlestick Anatomy: Body vs Wicks',
    'Risk-to-Reward Ratio (1:2 & 1:3)',
  ],
  intermediate: [
    'RSI Bullish & Bearish Divergence',
    'Intraday VWAP Pullback Strategy',
    'Multi-Timeframe Trend Confirmation',
    'Breakout vs False Breakdown (Fakeout)',
  ],
  advanced: [
    'Institutional Liquidity Sweeps',
    'Option Greeks: Intraday Theta Decay',
    'Fair Value Gaps (FVG) & Order Blocks',
    'Hedging Delivery Portfolios with Futures',
  ],
};

const PRACTICE_DILEMMAS = [
  {
    icon: '🎯',
    title: 'Stop Exiting Winners Too Early',
    desc: 'Master trailing stop-loss to ride trending multi-baggers',
    topic: 'Trailing Stop-Loss & Riding Trend Moves',
  },
  {
    icon: '🛡️',
    title: 'Conquering Fear of Stop-Loss',
    desc: 'Honor risk cuts mechanically without emotional pain',
    topic: 'Stop-Loss Mechanics & Psychological Acceptance',
  },
  {
    icon: '📊',
    title: 'Spotting Nifty & BankNifty Fakeouts',
    desc: 'Detect institutional trap candles and volume absorption',
    topic: 'False Breakouts & Bull/Bear Traps',
  },
  {
    icon: '⚡',
    title: 'Intraday 5x MIS Leverage Defense',
    desc: 'Prevent sudden margin calls and capital destruction',
    topic: 'Intraday MIS Leverage & Margin Call Management',
  },
];

export const AbhyasLearningScreen: React.FC<AbhyasLearningScreenProps> = () => {
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [categoryStates, setCategoryStates] = useState<Record<'beginner' | 'intermediate' | 'advanced', CategoryWorkspace>>({
    beginner: {
      selectedTopic: LEVEL_TOPICS.beginner[0],
      customTopic: '',
      lesson: null,
      meta: null,
      quizAnswers: {},
      quizResult: null,
    },
    intermediate: {
      selectedTopic: LEVEL_TOPICS.intermediate[0],
      customTopic: '',
      lesson: null,
      meta: null,
      quizAnswers: {},
      quizResult: null,
    },
    advanced: {
      selectedTopic: LEVEL_TOPICS.advanced[0],
      customTopic: '',
      lesson: null,
      meta: null,
      quizAnswers: {},
      quizResult: null,
    },
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState<boolean>(false);
  const [quizzesRemaining, setQuizzesRemaining] = useState<number | null>(null);
  const [quizzesLimit, setQuizzesLimit] = useState<number>(5);

  const current = categoryStates[difficulty];
  const { selectedTopic, customTopic, lesson, meta, quizAnswers, quizResult } = current;

  // Active quiz lockout: if lesson has questions and hasn't been submitted, user must complete it before generating another
  const hasIncompleteQuiz = Boolean(
    lesson && lesson.quizzes && lesson.quizzes.length > 0 && !quizResult
  );
  const isDailyLimitReached = quizzesRemaining !== null && quizzesRemaining <= 0;

  const updateCategoryWorkspace = (
    cat: 'beginner' | 'intermediate' | 'advanced',
    updates: Partial<CategoryWorkspace>
  ) => {
    setCategoryStates((prev) => ({
      ...prev,
      [cat]: {
        ...prev[cat],
        ...updates,
      },
    }));
  };

  const refreshQuota = async () => {
    try {
      const usage = await getAIUsage();
      if (usage?.data) {
        if (typeof usage.data.quizzesRemaining === 'number') {
          setQuizzesRemaining(usage.data.quizzesRemaining);
        }
        if (typeof usage.data.quizzesLimit === 'number') {
          setQuizzesLimit(usage.data.quizzesLimit);
        }
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    refreshQuota();
  }, []);

  const handleFetchLesson = async (topicToFetch: string) => {
    if (hasIncompleteQuiz) {
      setError(`Please complete the active quiz for "${lesson?.title || selectedTopic}" in ${difficulty.toUpperCase()} first!`);
      return;
    }
    if (isDailyLimitReached) {
      setError(`Daily quiz limit reached (${quizzesLimit} quizzes/day). Quota resets at 05:30 AM IST.`);
      return;
    }

    setLoading(true);
    setError(null);
    // Optimistic decrement for instant UI feedback
    setQuizzesRemaining((prev) => (prev !== null ? Math.max(0, prev - 1) : null));

    try {
      const res = await getAIEducation(topicToFetch, difficulty);
      updateCategoryWorkspace(difficulty, {
        lesson: res.data,
        meta: res.meta,
        quizAnswers: {},
        quizResult: null,
      });
      await refreshQuota();
    } catch (err: any) {
      await refreshQuota();
      setError(err?.message || 'Failed to load lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDifficultyChange = (newDiff: 'beginner' | 'intermediate' | 'advanced') => {
    setDifficulty(newDiff);
    setError(null);
  };

  const handleAnswerSelect = async (questionIndex: number, optionIndex: number) => {
    const updated = {
      ...quizAnswers,
      [questionIndex]: optionIndex,
    };
    updateCategoryWorkspace(difficulty, {
      quizAnswers: updated,
    });

    // If all questions answered and not yet submitted, auto-submit for XP award!
    if (lesson?.quizzes && Object.keys(updated).length === lesson.quizzes.length && !quizResult && !isSubmittingQuiz) {
      setIsSubmittingQuiz(true);
      try {
        let correctCount = 0;
        lesson.quizzes.forEach((q, idx) => {
          if (updated[idx] === q.correctIndex) {
            correctCount += 1;
          }
        });

        const res = await submitQuizCompletion(
          lesson.title || selectedTopic,
          difficulty,
          correctCount,
          lesson.quizzes.length,
          lesson.quizId
        );
        updateCategoryWorkspace(difficulty, {
          quizResult: res.data,
        });
        await refreshQuota();
      } catch (err) {
        console.error('Failed to submit quiz score:', err);
      } finally {
        setIsSubmittingQuiz(false);
      }
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-obsidian-950/90 text-slate-900 dark:text-slate-100 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-16 flex flex-col items-center justify-start relative select-none scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-obsidian-700">
      {/* Ambient Glowing Background Lights */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[400px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-brand-blue/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="w-full max-w-4xl flex flex-col items-center relative z-10 space-y-4 sm:space-y-6">
        {/* Sacred Sanskrit Shloka Hero Card */}
        <div className="w-full bg-white dark:bg-gradient-to-b dark:from-obsidian-800/90 dark:via-obsidian-900/90 dark:to-obsidian-950/95 border border-amber-300/80 dark:border-amber-500/25 rounded-3xl p-5 sm:p-6 pt-5 sm:pt-6 shadow-md dark:shadow-2xl backdrop-blur-xl relative overflow-hidden text-center group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-10 bg-amber-400/15 blur-xl rounded-full pointer-events-none" />

          <div className="my-0.5 sm:my-1">
            <h2 className="text-2xl sm:text-3xl md:text-[32px] font-bold text-amber-700 dark:text-amber-300 py-1.5 px-2 leading-[1.6] sm:leading-[1.7] tracking-normal drop-shadow-sm dark:drop-shadow-[0_2px_12px_rgba(251,191,36,0.35)]">
              अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते ।
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-amber-800/80 dark:text-amber-300/80 tracking-widest uppercase mt-1 font-mono">
              &ldquo;Abhyāsena tu kaunteya vairāgyeṇa ca gṛhyate&rdquo;
            </p>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-obsidian-700/60 text-center max-w-2xl mx-auto space-y-2">
            <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              &ldquo;Through continuous, disciplined practice (
              <span className="text-amber-700 dark:text-amber-300 font-bold">अभ्यास</span>) and emotional detachment (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">वैराग्य</span>), even the most volatile
              mind and complex mastery are conquered.&rdquo;
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
              Trading success is 80% emotional psychology and 20% technical strategy. AbhyasTrade
              gives you the sacred, zero-risk arena to build trader discipline, master risk
              management, and sharpen instincts before risking real capital.
            </p>
          </div>
        </div>

        {/* 3 Pillars of Abhyasa in Trading */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-wide uppercase">
                3 Pillars of Abhyāsa (त्रिरत्न)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
              Core Virtues for Market Mastery
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pillar 1 */}
            <div className="bg-white dark:bg-obsidian-900/80 hover:bg-slate-50 dark:hover:bg-obsidian-800/80 border border-slate-200 dark:border-obsidian-700/70 hover:border-emerald-500/40 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-sm dark:shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Pillar 1
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">१. अनुशासन (Discipline)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Honor your stop-loss without hesitation. Respect capital limits and never trade
                  without a defined exit strategy.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-obsidian-800 flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                <span>Capital Defense</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-500/30">
                  1-2% Max Risk
                </span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white dark:bg-obsidian-900/80 hover:bg-slate-50 dark:hover:bg-obsidian-800/80 border border-slate-200 dark:border-obsidian-700/70 hover:border-amber-500/40 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-sm dark:shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Pillar 2
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">२. वैराग्य (Detachment)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Detach your self-worth from individual trade outcomes. Treat wins and losses with
                  equal equanimity and focus on execution.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-obsidian-800 flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                <span>Trader Psychology</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-500/30">
                  Zero FOMO
                </span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white dark:bg-obsidian-900/80 hover:bg-slate-50 dark:hover:bg-obsidian-800/80 border border-slate-200 dark:border-obsidian-700/70 hover:border-brand-blue/40 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-sm dark:shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-brand-blue/20 border border-sky-300 dark:border-brand-blue/40 flex items-center justify-center text-brand-blue dark:text-brand-cyan mb-3 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-brand-blue dark:text-brand-cyan uppercase tracking-wider">
                    Pillar 3
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">३. अभ्यास (Practice)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Test intraday (5x MIS) and delivery (CNC) strategies on live NSE ticks with
                  ₹10,00,000 simulated capital and real charges.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-obsidian-800 flex items-center justify-between text-[11px] text-brand-blue dark:text-brand-cyan font-semibold">
                <span>Execution Mastery</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-brand-blue border border-sky-300 dark:bg-brand-blue/20 dark:text-brand-cyan dark:border-brand-blue/30">
                  ₹10L Virtual Capital
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dhanraj AI (धनराज) Sovereign Market Intelligence Showcase */}
        <div className="w-full bg-white dark:bg-gradient-to-r dark:from-obsidian-900/95 dark:via-obsidian-850/90 dark:to-obsidian-900/95 border border-sky-300 dark:border-brand-cyan/30 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-100 dark:bg-brand-cyan/10 border border-sky-300 dark:border-brand-cyan/30 flex items-center justify-center text-brand-blue dark:text-brand-cyan shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    Dhanraj AI{' '}
                    <span className="text-amber-600 dark:text-amber-300 font-serif font-bold text-xs sm:text-sm">
                      (धनराज)
                    </span>
                  </h4>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-brand-blue border border-sky-300 dark:bg-brand-blue/20 dark:text-brand-cyan dark:border-brand-blue/40">
                    Sovereign Market Intelligence
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 font-semibold">
                    10 Analyses / Day Included
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  While <strong className="text-slate-900 dark:text-slate-100 font-bold">अनुशासन</strong> (Discipline),{' '}
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">वैराग्य</strong> (Detachment), and{' '}
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">अभ्यास</strong> (Practice) build your
                  trader character,{' '}
                  <strong className="text-brand-blue dark:text-brand-cyan font-bold">Dhanraj AI</strong> equips you with
                  analytical discernment (विवेक). Get verified fundamental valuation, institutional
                  peer comparison, and technical summaries on any NSE stock directly inside your
                  trading chart.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-950/80 border border-sky-300 dark:border-brand-cyan/30 text-brand-blue dark:text-brand-cyan text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dhanraj AI on Charts</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================================== */}
        {/* INTERACTIVE AI TRADING GURU & QUIZ SECTION */}
        {/* ============================================================================== */}
        <div className="w-full bg-white dark:bg-gradient-to-r dark:from-obsidian-900/95 dark:via-obsidian-850/90 dark:to-obsidian-900/95 border border-sky-300 dark:border-brand-cyan/30 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-xl backdrop-blur-xl relative overflow-hidden group space-y-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />

          {/* Card Header (Identical design to Dhanraj AI above) */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10 border-b border-slate-200 dark:border-obsidian-800 pb-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-100 dark:bg-brand-cyan/10 border border-sky-300 dark:border-brand-cyan/30 flex items-center justify-center text-brand-blue dark:text-brand-cyan shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    Abhyas AI Guru{' '}
                    <span className="text-amber-600 dark:text-amber-300 font-serif font-bold text-xs sm:text-sm">
                      (अभ्यास गुरु)
                    </span>
                  </h4>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-brand-blue border border-sky-300 dark:bg-brand-blue/20 dark:text-brand-cyan dark:border-brand-blue/40">
                    Interactive Learning &amp; Quiz
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 font-semibold">
                    {quizzesRemaining !== null
                      ? `${quizzesRemaining}/${quizzesLimit} Quizzes Left Today`
                      : `${quizzesLimit} Quizzes / Day Included`}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  Build systematic market instincts through AI-guided concept breakdowns, real-world Indian market scenarios, and interactive dilemma quizzes. Complete quizzes to earn Trader XP and advance your rank with zero financial risk.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-950/80 border border-sky-300 dark:border-brand-cyan/30 text-brand-blue dark:text-brand-cyan text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Trader XP Arena</span>
              </div>
            </div>
          </div>

          {/* Step 1: Dedicated Difficulty Level Selector */}
          <div className="space-y-2.5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-brand-cyan/20 border border-sky-300 dark:border-brand-cyan/50 text-brand-blue dark:text-brand-cyan text-[11px] font-black flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Difficulty Level:
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                Active Category: <strong className="text-brand-blue dark:text-brand-cyan uppercase font-bold">{difficulty}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'beginner' as const,
                  label: 'Beginner',
                  badge: 'Jigyasu',
                  desc: 'Order mechanics, 1% risk defense rule & candlestick anatomy',
                },
                {
                  id: 'intermediate' as const,
                  label: 'Intermediate',
                  badge: 'Abhyasi',
                  desc: 'RSI divergence, VWAP intraday strategies & breakout validation',
                },
                {
                  id: 'advanced' as const,
                  label: 'Advanced',
                  badge: 'Sadhak',
                  desc: 'Liquidity sweeps, Option Greeks theta decay & futures hedging',
                },
              ].map((tier) => {
                const isSelected = difficulty === tier.id;
                const tierHasQuiz = categoryStates[tier.id].lesson !== null;
                const tierHasCompleted = categoryStates[tier.id].quizResult !== null;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => handleDifficultyChange(tier.id)}
                    className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-sky-50 border-brand-blue text-slate-900 dark:bg-brand-cyan/15 dark:border-brand-cyan dark:text-white shadow-sm ring-1 ring-brand-blue/40 dark:ring-brand-cyan/40'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-obsidian-900/80 dark:hover:bg-obsidian-850 dark:border-obsidian-750 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-extrabold uppercase tracking-wide ${
                              isSelected ? 'text-brand-blue dark:text-brand-cyan' : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {tier.label}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              isSelected
                                ? 'bg-sky-100 text-brand-blue border border-sky-300 dark:bg-brand-cyan/20 dark:text-brand-cyan dark:border-brand-cyan/40'
                                : 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-obsidian-800 dark:text-slate-400 dark:border-obsidian-700'
                            }`}
                          >
                            {tier.badge}
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-brand-blue bg-brand-blue dark:border-brand-cyan dark:bg-brand-cyan'
                              : 'border-slate-300 bg-white dark:border-obsidian-600 dark:bg-obsidian-950'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-obsidian-950" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {tier.desc}
                      </p>
                    </div>

                    {tierHasQuiz && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-obsidian-800 flex items-center gap-1.5 text-[10px] font-semibold">
                        {tierHasCompleted ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Completed (+XP)
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Active Quiz In Progress
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Curated Topic Chips & Custom Concept Input */}
          <div className="space-y-3 pt-1 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-brand-cyan/20 border border-sky-300 dark:border-brand-cyan/50 text-brand-blue dark:text-brand-cyan text-[11px] font-black flex items-center justify-center">
                  2
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select a {difficulty.toUpperCase()} Topic or Type Your Own:
                </span>
              </div>
              <span className="text-[11px] text-brand-blue dark:text-brand-cyan font-medium hidden sm:inline truncate max-w-xs">
                Selected: <strong className="text-slate-900 dark:text-white">{customTopic.trim() || selectedTopic}</strong>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {LEVEL_TOPICS[difficulty].map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => {
                    updateCategoryWorkspace(difficulty, {
                      selectedTopic: topic,
                      customTopic: '',
                    });
                    setError(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer active:scale-95 ${
                    selectedTopic === topic && !customTopic.trim()
                      ? 'bg-brand-blue text-white dark:bg-brand-cyan dark:text-slate-950 font-bold border-brand-blue dark:border-brand-cyan shadow-sm'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900 dark:bg-obsidian-800/80 dark:text-slate-300 dark:border-obsidian-700 dark:hover:border-slate-500 dark:hover:text-white'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Topic Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customTopic}
              onChange={(e) =>
                updateCategoryWorkspace(difficulty, {
                  customTopic: e.target.value,
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const targetTopic = customTopic.trim() || selectedTopic;
                  if (targetTopic) {
                    handleFetchLesson(targetTopic);
                  }
                }
              }}
              placeholder={`Or type any custom concept (e.g. Bollinger Bands, MACD)... Current: "${selectedTopic}"`}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-obsidian-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-blue dark:focus:border-brand-cyan"
            />
            <button
              onClick={() => {
                const targetTopic = customTopic.trim() || selectedTopic;
                if (targetTopic) {
                  handleFetchLesson(targetTopic);
                }
              }}
              disabled={loading || hasIncompleteQuiz || isDailyLimitReached || (!customTopic.trim() && !selectedTopic)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue to-teal-600 dark:from-brand-cyan dark:to-brand-blue text-white dark:text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Lesson &amp; Quiz...</span>
                </>
              ) : hasIncompleteQuiz ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Complete Active Quiz First</span>
                </>
              ) : isDailyLimitReached ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Daily Limit Reached</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask AI Guru</span>
                </>
              )}
            </button>
          </div>

          {/* Incomplete Quiz Lockout Notice Banner */}
          {hasIncompleteQuiz && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-amber-700 dark:text-amber-300">
                  Active {difficulty.toUpperCase()} Quiz in Progress
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  You have an active quiz for <span className="text-slate-900 dark:text-white font-semibold">&ldquo;{lesson?.title || selectedTopic}&rdquo;</span>. Please answer all questions below to earn your Trader XP before generating another topic in this level.
                </p>
              </div>
            </div>
          )}

          {/* 1-Click Interactive Practice Dilemmas (When user hasn't selected a lesson) */}
          {!lesson && !loading && (
            <div className="pt-2 border-t border-slate-200 dark:border-obsidian-800/80 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Or Pick a Real-World Trading Dilemma to Solve:
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRACTICE_DILEMMAS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (hasIncompleteQuiz) {
                        setError(`Please complete the active quiz for "${selectedTopic}" in ${difficulty.toUpperCase()} first!`);
                        return;
                      }
                      updateCategoryWorkspace(difficulty, {
                        selectedTopic: item.topic,
                        customTopic: '',
                      });
                      setError(null);
                    }}
                    className={`p-3 rounded-2xl border transition text-left group flex items-start gap-3 active:scale-98 shadow-sm cursor-pointer ${
                      selectedTopic === item.topic && !customTopic.trim()
                        ? 'bg-sky-50 border-brand-blue text-slate-900 dark:bg-brand-cyan/15 dark:border-brand-cyan dark:text-white shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-obsidian-850/80 dark:hover:bg-obsidian-800 dark:border-obsidian-750 dark:hover:border-brand-cyan/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-brand-blue dark:text-slate-200 dark:group-hover:text-brand-cyan transition-colors">
                        {item.title}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Lesson Display */}
          {lesson && (
            <div className="space-y-4 pt-2 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-white dark:bg-obsidian-850/80 border border-slate-200 dark:border-obsidian-700 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-blue dark:text-brand-cyan" />
                    {lesson.title}
                  </h4>
                  {meta && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                      {meta.cached ? '⚡ Instant Lesson' : '✨ Fresh'}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {lesson.summary}
                </p>
              </div>

              {/* Detailed Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-900/60 border border-slate-200 dark:border-obsidian-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Concept Breakdown
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {lesson.detailedExplanation}
                </p>
              </div>

              {/* Real World Example & Golden Rule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-cyan-950/20 border border-sky-200 dark:border-cyan-500/25 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-blue dark:text-brand-cyan uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4" />
                    <span>Real-World Indian Market Scenario</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {lesson.realWorldExample}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/25 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Golden Risk Management Rule</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {lesson.riskManagementRule}
                  </p>
                </div>
              </div>

              {/* Interactive Quizzes */}
              {lesson.quizzes && lesson.quizzes.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Test Your Understanding (Interactive Quiz)
                    </h5>
                  </div>

                  <div className="space-y-3">
                    {lesson.quizzes.map((q, qIdx) => {
                      const userSelection = quizAnswers[qIdx];
                      const isAnswered = userSelection !== undefined;
                      const isCorrect = userSelection === q.correctIndex;

                      return (
                        <div
                          key={qIdx}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-800/60 border border-slate-200 dark:border-obsidian-700/70 space-y-3"
                        >
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                            {qIdx + 1}. {q.question}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => {
                              let btnStyle =
                                'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-obsidian-900 dark:border-obsidian-700 dark:text-slate-300 dark:hover:border-slate-500';

                              if (isAnswered) {
                                if (optIdx === q.correctIndex) {
                                  btnStyle =
                                    'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold';
                                } else if (userSelection === optIdx) {
                                  btnStyle =
                                    'bg-rose-100 dark:bg-rose-950/60 border-rose-400 dark:border-rose-500 text-rose-800 dark:text-rose-200 font-bold';
                                } else {
                                  btnStyle =
                                    'bg-slate-100 dark:bg-obsidian-900/40 border-slate-200 dark:border-obsidian-800 text-slate-400 dark:text-slate-500';
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => handleAnswerSelect(qIdx, optIdx)}
                                  disabled={isAnswered}
                                  className={`p-2.5 rounded-xl border text-xs text-left transition flex items-center justify-between cursor-pointer ${btnStyle}`}
                                >
                                  <span>{opt}</span>
                                  {isAnswered && optIdx === q.correctIndex && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                                  )}
                                  {isAnswered &&
                                    userSelection === optIdx &&
                                    optIdx !== q.correctIndex && (
                                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 ml-2" />
                                    )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Explanation Card after answer */}
                          {isAnswered && (
                            <div
                              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
                              }`}
                            >
                              <strong className="block mb-0.5">
                                {isCorrect ? '✓ Correct!' : '✗ Explanation:'}
                              </strong>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Quiz Submission Loading & Victory XP Reward Card */}
                  {isSubmittingQuiz && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-obsidian-900 border border-sky-300 dark:border-brand-cyan/30 flex items-center justify-center gap-2.5 text-xs text-brand-blue dark:text-brand-cyan animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-blue dark:text-brand-cyan" />
                      <span className="font-semibold">Calculating Score & Awarding Trader XP...</span>
                    </div>
                  )}

                  {quizResult && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 dark:from-emerald-950/40 dark:via-obsidian-900 dark:to-obsidian-950 border border-emerald-300 dark:border-emerald-500/40 shadow-xl animate-in zoom-in-95 space-y-3 text-left">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-obsidian-800 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                            <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                          </div>
                          <div>
                            <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>Quiz Complete!</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold">
                                +{quizResult.xp_awarded} XP Awarded
                              </span>
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              Score: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{quizResult.score} / {quizResult.total_questions}</strong> ({Math.round((quizResult.score / quizResult.total_questions) * 100)}%)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1 rounded-xl bg-white dark:bg-obsidian-900 border border-amber-300 dark:border-amber-500/30 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 shadow-sm">
                            <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                            <span>Level {quizResult.level} • {quizResult.title}</span>
                          </div>
                        </div>
                      </div>

                      {quizResult.level_up && (
                        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-bold text-center animate-pulse">
                          🎉 LEVEL UP! You have advanced to Level {quizResult.level}: {quizResult.title}!
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs pt-1">
                        <span className="text-slate-600 dark:text-slate-400">
                          Total XP: <strong className="text-slate-900 dark:text-white font-mono">{quizResult.total_xp}</strong> • Target for Next Rank: <strong className="text-brand-blue dark:text-brand-cyan font-mono">{quizResult.next_level_xp} XP</strong>
                        </span>
                        <button
                          onClick={() => {
                            updateCategoryWorkspace(difficulty, {
                              quizAnswers: {},
                              quizResult: null,
                              lesson: null,
                              customTopic: '',
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 dark:bg-brand-blue/30 dark:hover:bg-brand-blue/40 border border-sky-300 dark:border-brand-cyan/40 text-brand-blue dark:text-brand-cyan text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Practice Another Concept</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Motivational Subhashitam Reflection */}
        <div className="text-center text-[11px] sm:text-xs text-slate-500 max-w-lg pt-2 pb-2">
          <p className="italic font-serif text-slate-400">
            &ldquo;करत करत अभ्यास के जड़मति होत सुजान । रसरी आवत जात ते सिल पर परत निसान ॥&rdquo;
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            AbhyasTrade • Cultivating disciplined, confident Indian traders through deliberate
            practice.
          </p>
        </div>
      </div>
    </div>
  );
};
