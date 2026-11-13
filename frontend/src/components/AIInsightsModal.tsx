import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  X,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Clock,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Newspaper,
  BookOpen,
  Info,
} from 'lucide-react';
import {
  StockQuote,
  StockAnalysisData,
  PeerComparisonData,
  SentimentData,
  AIResponseMeta,
  AIUsageSummary,
} from '../lib/types';
import {
  getAIStockAnalysis,
  getAIPeerComparison,
  getAINewsSentiment,
  getAIUsage,
} from '../lib/api';

interface AIInsightsModalProps {
  stock: StockQuote;
  onClose: () => void;
}

type TabType = 'ANALYSIS' | 'PEERS' | 'SENTIMENT';

// Sector peer suggestions for quick one-click comparison
const SECTOR_PEERS: Record<string, string[]> = {
  RELIANCE: ['ONGC', 'BPCL', 'IOC'],
  TCS: ['INFY', 'WIPRO', 'HCLTECH'],
  INFY: ['TCS', 'WIPRO', 'HCLTECH'],
  HDFCBANK: ['ICICIBANK', 'SBIN', 'KOTAKBANK'],
  ICICIBANK: ['HDFCBANK', 'SBIN', 'AXISBANK'],
  SBIN: ['HDFCBANK', 'ICICIBANK', 'BANKBARODA'],
  MARUTI: ['TATAMOTORS', 'M&M', 'BAJAJ-AUTO'],
  SUNPHARMA: ['DRREDDY', 'CIPLA', 'DIVISLAB'],
  TITAN: ['TRENT', 'KALYANKJIL', 'BATAINDIA'],
  ITC: ['HINDUNILVR', 'NESTLEIND', 'DABUR'],
};

// Helper to compute clean time elapsed since generation
function formatGeneratedTime(isoString?: string | null): { timeAgo: string; clockTime: string } {
  if (!isoString) return { timeAgo: 'recently', clockTime: '' };
  try {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    let timeAgo = 'just now';
    if (diffMins >= 60) {
      timeAgo = `${diffHours}h ago`;
    } else if (diffMins > 0) {
      timeAgo = `${diffMins}m ago`;
    }

    const clockTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { timeAgo, clockTime };
  } catch {
    return { timeAgo: 'recently', clockTime: '' };
  }
}

// Educational tooltips for key verified fundamental metrics in simple beginner-friendly language
const METRIC_TOOLTIPS = {
  pe: {
    title: 'Trailing P/E • Is it cheap or expensive?',
    desc: 'Shows how many rupees you pay for every ₹1 of profit the company makes. A lower number means the stock is cheap or at a discount. A higher number means investors expect fast future growth.',
    rule: '💡 Simple Rule: Below 20 = Good value / cheap. Above 40 = Pricey, high-growth expectation.',
  },
  de: {
    title: 'Debt to Equity • Does it have heavy loans?',
    desc: 'Compares how much loan/debt the company has versus its own cash and investments. If this number is very low (like 0.1), the company is virtually debt-free and super safe from bankruptcy.',
    rule: '💡 Simple Rule: Below 1.0 is safe & low-risk. Above 2.0 means heavy loans to repay.',
  },
  roe: {
    title: 'Return on Equity • How good is profit making?',
    desc: 'Measures how much profit the company creates using shareholders\' money. If you invest ₹100, an ROE of 30% means the business generated ₹30 in pure profit this year.',
    rule: '💡 Simple Rule: Above 15% is healthy. Above 30% is a top-tier money-making machine!',
  },
  pb: {
    title: 'Price to Book • Paying for real assets or brand?',
    desc: 'Compares the stock price against physical net assets (cash, factories, land) if the company sold everything today. Helps you see if you are paying close to real liquidation value or paying extra for brand trust.',
    rule: '💡 Simple Rule: Near 1–2x = Buying near physical asset value. 5x+ = Paying for strong brand & software.',
  },
};

// Helper to convert paragraph text into digestible bullet points
function formatBulletPoints(text?: string | null): string[] {
  if (!text) return [];
  const clean = text.trim();
  if (clean.includes('\n') || clean.includes('•') || clean.includes('- ')) {
    return clean
      .split(/\n|•|(?<=\s)-\s/)
      .map((s) => s.trim().replace(/^[-*•]\s*/, ''))
      .filter((s) => s.length > 5);
  }
  const sentences = clean
    .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim().replace(/^[-*•]\s*/, ''))
    .filter((s) => s.length > 5);
  return sentences.length > 0 ? sentences : [clean];
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({ stock, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('ANALYSIS');

  // Analysis State
  const [analysis, setAnalysis] = useState<StockAnalysisData | null>(null);
  const [analysisMeta, setAnalysisMeta] = useState<AIResponseMeta | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Peer State
  const defaultPeers = SECTOR_PEERS[stock.symbol]
    ? [stock.symbol, ...SECTOR_PEERS[stock.symbol].slice(0, 2)]
    : [stock.symbol, 'TCS'];
  const [peerSymbols, setPeerSymbols] = useState<string[]>(defaultPeers);
  const [peerInput, setPeerInput] = useState<string>('');
  const [peerData, setPeerData] = useState<PeerComparisonData | null>(null);
  const [peerMeta, setPeerMeta] = useState<AIResponseMeta | null>(null);
  const [peerLoading, setPeerLoading] = useState<boolean>(false);
  const [peerError, setPeerError] = useState<string | null>(null);

  // Sentiment State
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [sentimentMeta, setSentimentMeta] = useState<AIResponseMeta | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState<boolean>(false);
  const [sentimentError, setSentimentError] = useState<string | null>(null);

  // Usage State
  const [usage, setUsage] = useState<AIUsageSummary | null>(null);

  // Fetch Usage
  const refreshUsage = async () => {
    try {
      const res = await getAIUsage();
      if (res.success) setUsage(res.data);
    } catch {
      // Ignore background usage check failure
    }
  };

  // Initial Load: Stock Analysis
  const fetchStockAnalysis = async (forceRefresh: boolean = false) => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res = await getAIStockAnalysis(stock.symbol, 'NSE', forceRefresh);
      setAnalysis(res.data);
      setAnalysisMeta(res.meta);
      refreshUsage();
    } catch (err: any) {
      setAnalysisError(err?.message || 'Failed to generate stock analysis');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Load Peer Comparison
  const fetchPeerComparison = async (symbolsToCompare: string[], forceRefresh: boolean = false) => {
    setPeerLoading(true);
    setPeerError(null);
    try {
      const res = await getAIPeerComparison(symbolsToCompare, 'NSE', forceRefresh);
      setPeerData(res.data);
      setPeerMeta(res.meta);
      refreshUsage();
    } catch (err: any) {
      setPeerError(err?.message || 'Failed to compare peer companies');
    } finally {
      setPeerLoading(false);
    }
  };

  // Load News Sentiment
  const fetchSentiment = async (forceRefresh: boolean = false) => {
    setSentimentLoading(true);
    setSentimentError(null);
    try {
      const res = await getAINewsSentiment(stock.symbol, undefined, forceRefresh);
      setSentiment(res.data);
      setSentimentMeta(res.meta);
      refreshUsage();
    } catch (err: any) {
      setSentimentError(err?.message || 'Failed to evaluate news sentiment');
    } finally {
      setSentimentLoading(false);
    }
  };

  useEffect(() => {
    fetchStockAnalysis();
    refreshUsage();
  }, [stock.symbol]);

  // Tab change handlers
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'PEERS' && !peerData && !peerLoading) {
      fetchPeerComparison(peerSymbols);
    } else if (tab === 'SENTIMENT' && !sentiment && !sentimentLoading) {
      fetchSentiment();
    }
  };

  const handleAddPeer = () => {
    const clean = peerInput.trim().toUpperCase();
    if (clean && !peerSymbols.includes(clean) && peerSymbols.length < 5) {
      const updated = [...peerSymbols, clean];
      setPeerSymbols(updated);
      setPeerInput('');
      fetchPeerComparison(updated);
    }
  };

  const handleRemovePeer = (sym: string) => {
    if (sym === stock.symbol) return; // Keep target symbol
    if (peerSymbols.length <= 2) return; // Keep minimum 2
    const updated = peerSymbols.filter((s) => s !== sym);
    setPeerSymbols(updated);
    fetchPeerComparison(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-obsidian-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-gradient-to-b from-obsidian-900 via-obsidian-900/95 to-obsidian-950 border border-brand-cyan/25 rounded-3xl shadow-2xl shadow-cyan-950/40 overflow-hidden text-slate-100">
        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-72 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-obsidian-700/80 bg-obsidian-900/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-cyan/20 to-brand-blue/30 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan shadow-lg shadow-cyan-950/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Dhanraj AI
                </h2>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                  {stock.symbol}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {stock.name} • Sovereign Wealth & Market Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Free Quota Badge */}
            {usage && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-obsidian-800 border border-obsidian-700 text-xs text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-brand-cyan" />
                <span>
                  Free Quota:{' '}
                  <strong className="text-white">
                    {usage.stocksRemaining !== undefined ? usage.stocksRemaining : usage.heavyRemaining}/
                    {usage.stocksLimit !== undefined ? usage.stocksLimit : usage.heavyLimit}
                  </strong>{' '}
                  Stocks Left Today
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-obsidian-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-2.5 bg-obsidian-950/60 border-b border-obsidian-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange('ANALYSIS')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'ANALYSIS'
                  ? 'bg-brand-cyan text-obsidian-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Deep Analysis</span>
            </button>

            <button
              onClick={() => handleTabChange('PEERS')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'PEERS'
                  ? 'bg-brand-cyan text-obsidian-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Peer Comparison</span>
            </button>

            <button
              onClick={() => handleTabChange('SENTIMENT')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'SENTIMENT'
                  ? 'bg-brand-cyan text-obsidian-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800/60'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              <span>News Sentiment</span>
            </button>
          </div>

          {/* Active Provider & Cache Status */}
          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400">
            {activeTab === 'ANALYSIS' && analysisMeta && (
              <>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <Clock className="w-3 h-3" />
                  Generated: {formatGeneratedTime(analysisMeta.generatedAt).clockTime || 'Recently'}
                </span>
                <button
                  onClick={() => fetchStockAnalysis(true)}
                  disabled={analysisLoading}
                  title="Force re-generate latest AI analysis"
                  className="p-1 rounded-lg text-slate-400 hover:text-brand-cyan hover:bg-obsidian-800 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${analysisLoading ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}

            {activeTab === 'PEERS' && peerMeta && (
              <>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <Clock className="w-3 h-3" />
                  Generated: {formatGeneratedTime(peerMeta.generatedAt).clockTime || 'Recently'}
                </span>
                <button
                  onClick={() => fetchPeerComparison(peerSymbols, true)}
                  disabled={peerLoading}
                  title="Force re-generate peer comparison"
                  className="p-1 rounded-lg text-slate-400 hover:text-brand-cyan hover:bg-obsidian-800 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${peerLoading ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}

            {activeTab === 'SENTIMENT' && sentimentMeta && (
              <>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <Clock className="w-3 h-3" />
                  Generated: {formatGeneratedTime(sentimentMeta.generatedAt).clockTime || 'Recently'}
                </span>
                <button
                  onClick={() => fetchSentiment(true)}
                  disabled={sentimentLoading}
                  title="Force re-generate sentiment"
                  className="p-1 rounded-lg text-slate-400 hover:text-brand-cyan hover:bg-obsidian-800 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sentimentLoading ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}
            {/* Provider identifier badge */}
            {activeTab === 'ANALYSIS' && analysisMeta?.provider && (
              <span className="text-slate-400 font-mono text-[10px] hidden lg:inline pl-1 border-l border-obsidian-700">
                {analysisMeta.provider === 'gemini'
                  ? 'Google Gemini'
                  : analysisMeta.provider === 'groq'
                    ? 'Groq LPU'
                    : analysisMeta.provider === 'openrouter'
                      ? 'OpenRouter (Fallback)'
                      : 'Dhanraj Core'}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5 scrollbar-thin scrollbar-thumb-obsidian-700">
          {/* TAB 1: DEEP FUNDAMENTAL & TECHNICAL ANALYSIS */}
          {activeTab === 'ANALYSIS' && (
            <div className="space-y-5">
              {analysisLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-12 h-12 rounded-2xl border-2 border-brand-cyan/30 border-t-brand-cyan animate-spin flex items-center justify-center" />
                  <p className="text-sm font-semibold text-slate-200">
                    Extracting verified NSE metrics & reasoning with AI...
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Checking cache, computing valuation ratios, and analyzing revenue trends for{' '}
                    {stock.symbol}.
                  </p>
                </div>
              ) : analysisError ? (
                <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                  <h4 className="text-sm font-bold text-rose-200">Analysis Error</h4>
                  <p className="text-xs text-slate-300">{analysisError}</p>
                  <button
                    onClick={() => fetchStockAnalysis()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-obsidian-800 hover:bg-obsidian-700 border border-obsidian-600 text-xs font-semibold text-white transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Analysis</span>
                  </button>
                </div>
              ) : analysis ? (
                <>
                  {/* 1. Verified Valuation & Fundamental Metrics (Featured at TOP with (i) Tooltips) */}
                  {analysis.verifiedMetrics && (
                    <div className="p-4 rounded-2xl bg-obsidian-800/80 border border-obsidian-700/80 backdrop-blur-md shadow-lg relative z-20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-cyan flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Verified Valuation &amp; Fundamental Metrics</span>
                        </h4>
                        {analysis.verifiedMetrics?.marketCap && (
                          <span className="text-[11px] text-slate-300 font-mono font-medium">
                            Market Cap: <strong className="text-white">{analysis.verifiedMetrics.marketCap}</strong>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        {/* Trailing P/E */}
                        <div className="p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-700/70 hover:border-brand-cyan/40 transition flex flex-col justify-between relative group/tip cursor-help">
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-slate-400 text-[11px] font-medium">Trailing P/E</span>
                            <div className="p-0.5">
                              <Info className="w-3.5 h-3.5 text-slate-500 group-hover/tip:text-brand-cyan transition" />
                            </div>
                          </div>
                          <span className="text-white font-mono font-bold text-base sm:text-lg">
                            {analysis.verifiedMetrics.peRatio ?? 'N/A'}
                          </span>

                          {/* Tooltip popping cleanly on top of content below */}
                          <div className="absolute left-0 top-full mt-2 hidden group-hover/tip:block w-64 sm:w-72 p-3 rounded-xl bg-obsidian-900 border border-brand-cyan/40 shadow-2xl text-[11px] text-slate-200 z-50 pointer-events-none backdrop-blur-md">
                            <div className="absolute -top-1.5 left-6 w-3 h-3 rotate-45 bg-obsidian-900 border-t border-l border-brand-cyan/40" />
                            <strong className="text-brand-cyan block font-semibold mb-1 relative z-10">{METRIC_TOOLTIPS.pe.title}</strong>
                            <p className="text-slate-300 leading-relaxed relative z-10 mb-1.5">{METRIC_TOOLTIPS.pe.desc}</p>
                            <div className="pt-1.5 border-t border-obsidian-700/60 text-amber-300 font-medium text-[10px] relative z-10">
                              {METRIC_TOOLTIPS.pe.rule}
                            </div>
                          </div>
                        </div>

                        {/* Debt to Equity */}
                        <div className="p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-700/70 hover:border-brand-cyan/40 transition flex flex-col justify-between relative group/tip cursor-help">
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-slate-400 text-[11px] font-medium">Debt to Equity</span>
                            <div className="p-0.5">
                              <Info className="w-3.5 h-3.5 text-slate-500 group-hover/tip:text-brand-cyan transition" />
                            </div>
                          </div>
                          <span className="text-white font-mono font-bold text-base sm:text-lg">
                            {analysis.verifiedMetrics.debtToEquity ?? 'N/A'}
                          </span>

                          {/* Tooltip popping cleanly on top of content below */}
                          <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover/tip:block w-64 sm:w-72 p-3 rounded-xl bg-obsidian-900 border border-brand-cyan/40 shadow-2xl text-[11px] text-slate-200 z-50 pointer-events-none backdrop-blur-md">
                            <div className="absolute -top-1.5 left-6 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 rotate-45 bg-obsidian-900 border-t border-l border-brand-cyan/40" />
                            <strong className="text-brand-cyan block font-semibold mb-1 relative z-10">{METRIC_TOOLTIPS.de.title}</strong>
                            <p className="text-slate-300 leading-relaxed relative z-10 mb-1.5">{METRIC_TOOLTIPS.de.desc}</p>
                            <div className="pt-1.5 border-t border-obsidian-700/60 text-amber-300 font-medium text-[10px] relative z-10">
                              {METRIC_TOOLTIPS.de.rule}
                            </div>
                          </div>
                        </div>

                        {/* Return on Equity */}
                        <div className="p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-700/70 hover:border-brand-cyan/40 transition flex flex-col justify-between relative group/tip cursor-help">
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-slate-400 text-[11px] font-medium">Return on Equity</span>
                            <div className="p-0.5">
                              <Info className="w-3.5 h-3.5 text-slate-500 group-hover/tip:text-brand-cyan transition" />
                            </div>
                          </div>
                          <span className="text-white font-mono font-bold text-base sm:text-lg">
                            {analysis.verifiedMetrics.returnOnEquity ?? 'N/A'}
                          </span>

                          {/* Tooltip popping cleanly on top of content below */}
                          <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover/tip:block w-64 sm:w-72 p-3 rounded-xl bg-obsidian-900 border border-brand-cyan/40 shadow-2xl text-[11px] text-slate-200 z-50 pointer-events-none backdrop-blur-md">
                            <div className="absolute -top-1.5 right-6 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 rotate-45 bg-obsidian-900 border-t border-l border-brand-cyan/40" />
                            <strong className="text-brand-cyan block font-semibold mb-1 relative z-10">{METRIC_TOOLTIPS.roe.title}</strong>
                            <p className="text-slate-300 leading-relaxed relative z-10 mb-1.5">{METRIC_TOOLTIPS.roe.desc}</p>
                            <div className="pt-1.5 border-t border-obsidian-700/60 text-amber-300 font-medium text-[10px] relative z-10">
                              {METRIC_TOOLTIPS.roe.rule}
                            </div>
                          </div>
                        </div>

                        {/* Price to Book */}
                        <div className="p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-700/70 hover:border-brand-cyan/40 transition flex flex-col justify-between relative group/tip cursor-help">
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-slate-400 text-[11px] font-medium">Price to Book</span>
                            <div className="p-0.5">
                              <Info className="w-3.5 h-3.5 text-slate-500 group-hover/tip:text-brand-cyan transition" />
                            </div>
                          </div>
                          <span className="text-white font-mono font-bold text-base sm:text-lg">
                            {analysis.verifiedMetrics.priceToBook ?? 'N/A'}
                          </span>

                          {/* Tooltip popping cleanly on top of content below */}
                          <div className="absolute right-0 top-full mt-2 hidden group-hover/tip:block w-64 sm:w-72 p-3 rounded-xl bg-obsidian-900 border border-brand-cyan/40 shadow-2xl text-[11px] text-slate-200 z-50 pointer-events-none backdrop-blur-md">
                            <div className="absolute -top-1.5 right-6 w-3 h-3 rotate-45 bg-obsidian-900 border-t border-l border-brand-cyan/40" />
                            <strong className="text-brand-cyan block font-semibold mb-1 relative z-10">{METRIC_TOOLTIPS.pb.title}</strong>
                            <p className="text-slate-300 leading-relaxed relative z-10 mb-1.5">{METRIC_TOOLTIPS.pb.desc}</p>
                            <div className="pt-1.5 border-t border-obsidian-700/60 text-amber-300 font-medium text-[10px] relative z-10">
                              {METRIC_TOOLTIPS.pb.rule}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Overview Card (in Bullet Points) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-obsidian-800/80 border border-obsidian-700/80 backdrop-blur-md space-y-2.5 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan">
                        Executive Company Overview
                      </span>
                      {analysis.verifiedMetrics?.currentPrice && (
                        <span className="text-xs text-slate-300 font-mono">
                          LTP: <strong className="text-emerald-400">₹{Number(analysis.verifiedMetrics.currentPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200">
                      {formatBulletPoints(analysis.overview).map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-brand-cyan mt-1 text-[11px] shrink-0">•</span>
                          <span className="leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 3. 4 Pillars Financial Performance Grid (in Bullet Points) */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      4 Pillars of Financial Health (Verified Data)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/60 space-y-2">
                        <span className="text-xs font-bold text-emerald-400 block">
                          1. Top-Line Revenue
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {formatBulletPoints(analysis.financialPerformance.revenue).map((pt, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-emerald-400 mt-0.5 text-[10px] shrink-0">•</span>
                              <span className="leading-relaxed">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/60 space-y-2">
                        <span className="text-xs font-bold text-cyan-400 block">
                          2. Profitability &amp; Margins
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {formatBulletPoints(analysis.financialPerformance.profitability).map((pt, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-cyan-400 mt-0.5 text-[10px] shrink-0">•</span>
                              <span className="leading-relaxed">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/60 space-y-2">
                        <span className="text-xs font-bold text-amber-400 block">
                          3. Debt &amp; Balance Sheet
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {formatBulletPoints(analysis.financialPerformance.debt).map((pt, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-400 mt-0.5 text-[10px] shrink-0">•</span>
                              <span className="leading-relaxed">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/60 space-y-2">
                        <span className="text-xs font-bold text-indigo-400 block">
                          4. Cash Flow &amp; Liquidity
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {formatBulletPoints(analysis.financialPerformance.cashFlow).map((pt, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-indigo-400 mt-0.5 text-[10px] shrink-0">•</span>
                              <span className="leading-relaxed">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* 4. Strengths & Risks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Core Fundamental Strengths</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {analysis.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span className="leading-relaxed">{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Risks */}
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/25 space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Vulnerabilities &amp; Risks</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {analysis.risks.map((risk, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-rose-400 mt-0.5">•</span>
                            <span className="leading-relaxed">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 5. Valuation & Technical Summary (in Bullet Points) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {analysis.valuation && (
                      <div className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/60 space-y-2">
                        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                          Valuation Perspective
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {formatBulletPoints(analysis.valuation).map((pt, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-400 mt-0.5 text-[10px] shrink-0">•</span>
                              <span className="leading-relaxed">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.technicalSummary && (
                      <div className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/60 space-y-2">
                        <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider block">
                          Technical &amp; Momentum Summary
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {formatBulletPoints(analysis.technicalSummary).map((pt, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-brand-cyan mt-0.5 text-[10px] shrink-0">•</span>
                              <span className="leading-relaxed">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* 6. Conclusion (in Bullet Points) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/30 to-brand-blue/20 border border-cyan-500/30 space-y-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Learner &amp; Virtual Trader Synthesis
                    </span>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200">
                      {formatBulletPoints(analysis.conclusion).map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-brand-cyan mt-1 text-[11px] shrink-0">•</span>
                          <span className="leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* TAB 2: PEER COMPARISON */}
          {activeTab === 'PEERS' && (
            <div className="space-y-5">
              {/* Peer Symbol Selector */}
              <div className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Comparing {peerSymbols.length} Peers:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Compare 2 to 5 peers simultaneously
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {peerSymbols.map((sym) => (
                    <span
                      key={sym}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-obsidian-900 border border-obsidian-700 text-xs font-mono font-bold text-brand-cyan"
                    >
                      {sym}
                      {sym !== stock.symbol && peerSymbols.length > 2 && (
                        <button
                          onClick={() => handleRemovePeer(sym)}
                          className="hover:text-rose-400 transition ml-1"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}

                  {peerSymbols.length < 5 && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={peerInput}
                        onChange={(e) => setPeerInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPeer()}
                        placeholder="+ Add Symbol"
                        className="px-3 py-1 rounded-xl bg-obsidian-900 border border-obsidian-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan w-28 uppercase"
                      />
                      <button
                        onClick={handleAddPeer}
                        className="px-2.5 py-1 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan text-xs font-bold hover:bg-brand-cyan/30 transition"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {peerLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
                  <div className="w-10 h-10 rounded-2xl border-2 border-brand-cyan/30 border-t-brand-cyan animate-spin" />
                  <p className="text-sm font-semibold text-slate-200">
                    Fetching peer metrics & generating comparison...
                  </p>
                </div>
              ) : peerError ? (
                <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                  <h4 className="text-sm font-bold text-rose-200">Peer Comparison Failed</h4>
                  <p className="text-xs text-slate-300">{peerError}</p>
                </div>
              ) : peerData ? (
                <>
                  {/* Peer Metrics Comparison Table */}
                  <div className="overflow-x-auto rounded-2xl border border-obsidian-700/80 bg-obsidian-900/60">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-obsidian-800 text-slate-400 border-b border-obsidian-700">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Symbol</th>
                          <th className="py-2.5 px-3 font-semibold">Company</th>
                          <th className="py-2.5 px-3 font-semibold font-mono">Market Cap</th>
                          <th className="py-2.5 px-3 font-semibold font-mono">P/E Ratio</th>
                          <th className="py-2.5 px-3 font-semibold font-mono">Debt/Equity</th>
                          <th className="py-2.5 px-3 font-semibold font-mono">ROE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-obsidian-800">
                        {peerData.peers.map((p) => (
                          <tr key={p.symbol} className="hover:bg-obsidian-800/40 transition">
                            <td className="py-2.5 px-3 font-bold text-brand-cyan font-mono">
                              {p.symbol}
                            </td>
                            <td className="py-2.5 px-3 text-slate-200">{p.companyName}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {p.marketCap ?? 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {p.pe ?? 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {p.debtToEquity ?? 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {p.roe ?? 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Business & Valuation Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/60 space-y-1.5">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        Business &amp; Moat Comparison
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {peerData.businessComparison}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/60 space-y-1.5">
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Valuation Multiples Comparison
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {peerData.valuationComparison}
                      </p>
                    </div>
                  </div>

                  {/* Key Differences */}
                  <div className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/60 space-y-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Crucial Differentiating Factors
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {peerData.keyDifferences.map((diff, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-brand-cyan mt-0.5">•</span>
                          <span className="leading-relaxed">{diff}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Peer Conclusion */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 to-brand-blue/20 border border-cyan-500/30 space-y-1.5">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Synthesis for Learners
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">{peerData.conclusion}</p>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* TAB 3: NEWS SENTIMENT */}
          {activeTab === 'SENTIMENT' && (
            <div className="space-y-5">
              {sentimentLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
                  <div className="w-10 h-10 rounded-2xl border-2 border-brand-cyan/30 border-t-brand-cyan animate-spin" />
                  <p className="text-sm font-semibold text-slate-200">
                    Scanning news headlines & calculating market sentiment...
                  </p>
                </div>
              ) : sentimentError ? (
                <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                  <h4 className="text-sm font-bold text-rose-200">Sentiment Analysis Error</h4>
                  <p className="text-xs text-slate-300">{sentimentError}</p>
                </div>
              ) : sentiment ? (
                <>
                  {/* Overall Sentiment Banner */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      sentiment.overallSentiment === 'POSITIVE'
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : sentiment.overallSentiment === 'NEGATIVE'
                          ? 'bg-rose-950/30 border-rose-500/40'
                          : 'bg-amber-950/30 border-amber-500/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Overall Headline Sentiment:
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono uppercase tracking-wide ${
                            sentiment.overallSentiment === 'POSITIVE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : sentiment.overallSentiment === 'NEGATIVE'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {sentiment.overallSentiment}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {sentiment.summary}
                      </p>
                    </div>

                    <div className="text-right sm:border-l sm:border-obsidian-700/80 sm:pl-5">
                      <span className="text-[11px] text-slate-400 block">Score (-1 to +1)</span>
                      <span
                        className={`text-xl font-mono font-black ${
                          sentiment.overallScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {sentiment.overallScore > 0
                          ? `+${sentiment.overallScore.toFixed(2)}`
                          : sentiment.overallScore.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Analyzed Articles List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Recent Verified Headlines Evaluated ({sentiment.articles.length})
                    </h4>

                    {sentiment.articles.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-obsidian-800/60 border border-obsidian-700/60 space-y-2 hover:bg-obsidian-800/80 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h5 className="text-xs sm:text-sm font-semibold text-white leading-snug">
                            {item.headline}
                          </h5>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono shrink-0 ${
                              item.sentiment === 'POSITIVE'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                                : item.sentiment === 'NEGATIVE'
                                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                            }`}
                          >
                            {item.sentiment}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{item.reasoning}</p>

                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-obsidian-700/40">
                          <span>
                            Source: <strong className="text-slate-300">{item.publisher}</strong>
                          </span>
                          <span>Relevance: {item.companyRelevance}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Modal Footer with SEBI Educational Disclaimer */}
        <div className="px-5 sm:px-6 py-3 border-t border-obsidian-700/80 bg-obsidian-950/95 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Educational Zero-Risk Terminal:</strong> Dhanraj AI analysis does not
              constitute financial advice. All verified metrics sourced directly from exchange feeds.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-obsidian-800 hover:bg-obsidian-700 border border-obsidian-700 text-xs font-semibold text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
