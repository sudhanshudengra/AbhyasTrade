import {
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { getAIEducation } from '../lib/api';
import { AIResponseMeta, EducationData } from '../lib/types';

interface AbhyasLearningScreenProps {
  onSelectSymbol?: (symbol: string) => void;
  onOpenChargesCalc?: () => void;
}

const CURATED_TOPICS = [
  'Risk-to-Reward & 1% Rule',
  'RSI & Momentum Trading',
  'Intraday VWAP Strategy',
  'Vairagya: Conquering FOMO',
  'Stop-Loss Mechanics',
  'Support & Resistance',
];

export const AbhyasLearningScreen: React.FC<AbhyasLearningScreenProps> = () => {
  const [selectedTopic, setSelectedTopic] = useState<string>(CURATED_TOPICS[0]);
  const [customTopic, setCustomTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(
    'beginner'
  );
  const [lesson, setLesson] = useState<EducationData | null>(null);
  const [meta, setMeta] = useState<AIResponseMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  const handleFetchLesson = async (topicToFetch: string) => {
    setLoading(true);
    setError(null);
    setQuizAnswers({});
    try {
      const res = await getAIEducation(topicToFetch, difficulty);
      setLesson(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err?.message || 'Failed to load lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-obsidian-950/90 text-slate-100 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-16 flex flex-col items-center justify-start relative select-none scrollbar-thin scrollbar-thumb-obsidian-700">
      {/* Ambient Glowing Background Lights */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[400px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-brand-blue/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="w-full max-w-4xl flex flex-col items-center relative z-10 space-y-4 sm:space-y-6">
        {/* Sacred Sanskrit Shloka Hero Card */}
        <div className="w-full bg-gradient-to-b from-obsidian-800/90 via-obsidian-900/90 to-obsidian-950/95 border border-amber-500/25 rounded-3xl p-5 sm:p-6 pt-5 sm:pt-6 shadow-2xl backdrop-blur-xl relative overflow-hidden text-center group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-10 bg-amber-400/15 blur-xl rounded-full pointer-events-none" />

          <div className="my-0.5 sm:my-1">
            <h2 className="text-2xl sm:text-3xl md:text-[32px] font-bold text-amber-300 py-1.5 px-2 leading-[1.6] sm:leading-[1.7] tracking-normal drop-shadow-[0_2px_12px_rgba(251,191,36,0.35)]">
              अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते ।
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-amber-300/80 tracking-widest uppercase mt-1 font-mono">
              &ldquo;Abhyāsena tu kaunteya vairāgyeṇa ca gṛhyate&rdquo;
            </p>
          </div>

          <div className="mt-5 pt-5 border-t border-obsidian-700/60 text-center max-w-2xl mx-auto space-y-2">
            <p className="text-sm sm:text-base font-semibold text-slate-200 leading-relaxed">
              &ldquo;Through continuous, disciplined practice (
              <span className="text-amber-300 font-bold">अभ्यास</span>) and emotional detachment (
              <span className="text-emerald-400 font-bold">वैराग्य</span>), even the most volatile
              mind and complex mastery are conquered.&rdquo;
            </p>
            <p className="text-xs text-slate-400 leading-relaxed pt-1">
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
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                3 Pillars of Abhyāsa (त्रिरत्न)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Core Virtues for Market Mastery
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pillar 1 */}
            <div className="bg-obsidian-900/80 hover:bg-obsidian-800/80 border border-obsidian-700/70 hover:border-emerald-500/40 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Pillar 1
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-sm font-extrabold text-white">१. अनुशासन (Discipline)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Honor your stop-loss without hesitation. Respect capital limits and never trade
                  without a defined exit strategy.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-obsidian-800 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                <span>Capital Defense</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30">
                  1-2% Max Risk
                </span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-obsidian-900/80 hover:bg-obsidian-800/80 border border-obsidian-700/70 hover:border-amber-500/40 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Pillar 2
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-sm font-extrabold text-white">२. वैराग्य (Detachment)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Detach your self-worth from individual trade outcomes. Treat wins and losses with
                  equal equanimity and focus on execution.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-obsidian-800 flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                <span>Trader Psychology</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/30">
                  Zero FOMO
                </span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-obsidian-900/80 hover:bg-obsidian-800/80 border border-obsidian-700/70 hover:border-brand-blue/40 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center text-brand-cyan mb-3 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">
                    Pillar 3
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-sm font-extrabold text-white">३. अभ्यास (Practice)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Test intraday (5x MIS) and delivery (CNC) strategies on live NSE ticks with
                  ₹10,00,000 simulated capital and real charges.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-obsidian-800 flex items-center justify-between text-[11px] text-brand-cyan font-semibold">
                <span>Execution Mastery</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-blue/20 border border-brand-blue/30">
                  ₹10L Virtual Capital
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dhanraj AI (धनराज) Sovereign Market Intelligence Showcase */}
        <div className="w-full bg-gradient-to-r from-obsidian-900/95 via-obsidian-850/90 to-obsidian-900/95 border border-brand-cyan/30 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-brand-cyan" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                    Dhanraj AI{' '}
                    <span className="text-amber-300 font-serif font-bold text-xs sm:text-sm">
                      (धनराज)
                    </span>
                  </h4>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-blue/20 text-brand-cyan border border-brand-blue/40">
                    Sovereign Market Intelligence
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                    15 Analyses / Day Included
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  While <strong className="text-slate-100 font-bold">अनुशासन</strong> (Discipline),{' '}
                  <strong className="text-slate-100 font-bold">वैराग्य</strong> (Detachment), and{' '}
                  <strong className="text-slate-100 font-bold">अभ्यास</strong> (Practice) build your
                  trader character,{' '}
                  <strong className="text-brand-cyan font-bold">Dhanraj AI</strong> equips you with
                  analytical discernment (विवेक). Get verified fundamental valuation, institutional
                  peer comparison, and technical summaries on any NSE stock directly inside your
                  trading chart.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <div className="px-3 py-1.5 rounded-xl bg-obsidian-950/80 border border-brand-cyan/30 text-brand-cyan text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dhanraj AI on Charts</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================================== */}
        {/* INTERACTIVE AI TRADING GURU & QUIZ SECTION */}
        {/* ============================================================================== */}
        <div className="w-full bg-gradient-to-b from-obsidian-900/90 to-obsidian-950/90 border border-brand-cyan/25 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-obsidian-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-brand-cyan">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Abhyas AI Trading Guru &amp; Interactive Quiz
                </h3>
                <p className="text-xs text-slate-400">
                  Free trading education, real Indian stock examples, and self-testing quizzes
                </p>
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className="flex items-center bg-obsidian-900 p-1 rounded-xl border border-obsidian-700 text-xs">
              {(['beginner', 'intermediate', 'advanced'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                    difficulty === diff
                      ? 'bg-brand-cyan text-obsidian-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Curated Topic Chips */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Select or Explore a Concept:
            </span>
            <div className="flex flex-wrap gap-2">
              {CURATED_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => {
                    setSelectedTopic(topic);
                    handleFetchLesson(topic);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    selectedTopic === topic
                      ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/50 shadow-sm'
                      : 'bg-obsidian-800/80 text-slate-300 border-obsidian-700 hover:border-slate-500'
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
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customTopic.trim()) {
                  setSelectedTopic(customTopic.trim());
                  handleFetchLesson(customTopic.trim());
                }
              }}
              placeholder="Or type any trading concept (e.g. Bollinger Bands, MACD Crossover)..."
              className="flex-1 px-4 py-2 rounded-xl bg-obsidian-900 border border-obsidian-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
            />
            <button
              onClick={() => {
                if (customTopic.trim()) {
                  setSelectedTopic(customTopic.trim());
                  handleFetchLesson(customTopic.trim());
                } else {
                  handleFetchLesson(selectedTopic);
                }
              }}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-blue hover:from-cyan-400 hover:to-blue-500 text-obsidian-950 font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask AI Guru</span>
                </>
              )}
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Lesson Display */}
          {lesson && (
            <div className="space-y-4 pt-2 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-obsidian-850/80 border border-obsidian-700 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-cyan" />
                    {lesson.title}
                  </h4>
                  {meta && (
                    <span className="text-[11px] text-emerald-400 font-mono">
                      {meta.cached ? '⚡ Instant Lesson' : '✨ Fresh'}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  {lesson.summary}
                </p>
              </div>

              {/* Detailed Breakdown */}
              <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-obsidian-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Concept Breakdown
                </span>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {lesson.detailedExplanation}
                </p>
              </div>

              {/* Real World Example & Golden Rule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/25 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-cyan uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4" />
                    <span>Real-World Indian Market Scenario</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lesson.realWorldExample}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/25 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Golden Risk Management Rule</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lesson.riskManagementRule}
                  </p>
                </div>
              </div>

              {/* Interactive Quizzes */}
              {lesson.quizzes && lesson.quizzes.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
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
                          className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/70 space-y-3"
                        >
                          <p className="text-xs sm:text-sm font-semibold text-white">
                            {qIdx + 1}. {q.question}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => {
                              let btnStyle =
                                'bg-obsidian-900 border-obsidian-700 text-slate-300 hover:border-slate-500';

                              if (isAnswered) {
                                if (optIdx === q.correctIndex) {
                                  btnStyle =
                                    'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold';
                                } else if (userSelection === optIdx) {
                                  btnStyle =
                                    'bg-rose-950/60 border-rose-500 text-rose-200 font-bold';
                                } else {
                                  btnStyle =
                                    'bg-obsidian-900/40 border-obsidian-800 text-slate-500';
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => handleAnswerSelect(qIdx, optIdx)}
                                  disabled={isAnswered}
                                  className={`p-2.5 rounded-xl border text-xs text-left transition flex items-center justify-between ${btnStyle}`}
                                >
                                  <span>{opt}</span>
                                  {isAnswered && optIdx === q.correctIndex && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                                  )}
                                  {isAnswered &&
                                    userSelection === optIdx &&
                                    optIdx !== q.correctIndex && (
                                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
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
                                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                                  : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
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
