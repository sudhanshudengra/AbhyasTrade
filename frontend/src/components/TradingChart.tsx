import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { StockQuote, CandleData } from '../lib/types';
import { getChartCandles } from '../lib/api';
import { BarChart2, TrendingUp, TrendingDown, CandlestickChart } from 'lucide-react';

interface TradingChartProps {
  stock: StockQuote | null;
  onOpenOrderModal: (symbol: string, side: 'BUY' | 'SELL') => void;
}

type ChartType = 'AREA' | 'CANDLE';

const TIMEFRAMES = [
  { id: '1D', label: '1D' },
  { id: '5D', label: '5D' },
  { id: '1M', label: '1M' },
  { id: '1Y', label: '1Y' },
  { id: '5Y', label: '5Y' },
  { id: 'Max', label: 'Max' },
];

export const TradingChart: React.FC<TradingChartProps> = ({ stock, onOpenOrderModal }) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const prevCloseLineRef = useRef<any>(null);
  const rawCandlesRef = useRef<CandleData[]>([]);
  const lastCandleRef = useRef<CandleData | null>(null);

  // Line chart is DEFAULT as shown in Google Finance / Groww style
  const [chartType, setChartType] = useState<ChartType>('AREA');
  const [timeframe, setTimeframe] = useState<string>('1D');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    price: number;
    time: string;
    isUp: boolean;
  } | null>(null);

  const isPositive = (stock?.change ?? 0) >= 0;

  // Format date and time in IST (12-hour AM/PM format)
  const formatISTTimestamp = (timestamp: number, tf: string) => {
    const date = new Date(timestamp * 1000);
    if (tf === '1D') {
      const timeStr = date.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).toLowerCase();
      const monthStr = date.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
      });
      return `${monthStr}, ${timeStr}`;
    }
    if (tf === '5D' || tf === '1M') {
      const dStr = date.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
      });
      const tStr = date.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).toLowerCase();
      return `${dStr}, ${tStr}`;
    }
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Initialize or re-create chart instance with dynamic timeframe localization
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
      prevCloseLineRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 400;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0b0e14' },
        textColor: '#94a3b8',
        fontFamily: '"JetBrains Mono", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 11,
      },
      localization: {
        locale: 'en-IN',
        dateFormat: 'dd MMM yyyy',
        timeFormatter: (timestamp: number) => formatISTTimestamp(timestamp, timeframe),
      },
      grid: {
        vertLines: { color: 'rgba(30, 38, 56, 0.40)' },
        horzLines: { color: 'rgba(30, 38, 56, 0.40)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#10b981',
          width: 1,
          style: LineStyle.Solid,
          labelBackgroundColor: '#131822',
        },
        horzLine: {
          color: '#3b82f6',
          width: 1,
          style: LineStyle.Dotted,
          labelBackgroundColor: '#131822',
        },
      },
      rightPriceScale: {
        borderColor: '#1e2638',
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#1e2638',
        timeVisible: timeframe === '1D' || timeframe === '5D',
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: timeframe === '1D' ? 12 : (timeframe === '5D' ? 8 : 6),
        minBarSpacing: 3,
        fixLeftEdge: false,
        fixRightEdge: false,
        shiftVisibleRangeOnNewBar: true,
        tickMarkFormatter: (timestamp: number) => {
          const date = new Date(timestamp * 1000);
          if (timeframe === '1D') {
            return date.toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }).toLowerCase();
          }
          if (timeframe === '5D' || timeframe === '1M') {
            return date.toLocaleDateString('en-IN', {
              timeZone: 'Asia/Kolkata',
              day: 'numeric',
              month: 'short',
            });
          }
          if (timeframe === '1Y' || timeframe === '5Y' || timeframe === 'Max') {
            return date.toLocaleDateString('en-IN', {
              timeZone: 'Asia/Kolkata',
              year: 'numeric',
              month: 'short',
            });
          }
          return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
        },
      },
    });

    if (chartType === 'AREA') {
      const strokeColor = isPositive ? '#22c55e' : '#ef4444';
      const areaSeries = chart.addAreaSeries({
        lineColor: strokeColor,
        topColor: isPositive ? 'rgba(34, 197, 94, 0.20)' : 'rgba(239, 68, 68, 0.20)',
        bottomColor: 'rgba(0, 0, 0, 0.0)',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBackgroundColor: strokeColor,
      });
      areaSeriesRef.current = areaSeries;

      // Add Previous Close Dotted Reference Baseline as shown in screenshot
      if (stock && stock.close > 0) {
        prevCloseLineRef.current = areaSeries.createPriceLine({
          price: stock.close,
          color: '#475569',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `${stock.close.toFixed(2)}`,
        });
      }
    } else {
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      candleSeriesRef.current = candleSeries;

      if (stock && stock.close > 0) {
        prevCloseLineRef.current = candleSeries.createPriceLine({
          price: stock.close,
          color: '#475569',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `${stock.close.toFixed(2)}`,
        });
      }
    }

    // Subscribe to crosshair move to show Google Finance style floating card
    chart.subscribeCrosshairMove((param) => {
      if (
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > width ||
        param.point.y < 0 ||
        param.point.y > height
      ) {
        setTooltipState(null);
        return;
      }

      let price = 0;
      if (chartType === 'AREA' && areaSeriesRef.current) {
        const aData = param.seriesData.get(areaSeriesRef.current) as any;
        if (aData) price = aData.value;
      } else if (chartType === 'CANDLE' && candleSeriesRef.current) {
        const cData = param.seriesData.get(candleSeriesRef.current) as any;
        if (cData) price = cData.close;
      }

      if (!price && stock) price = stock.ltp;

      const formattedTime = formatISTTimestamp(param.time as number, timeframe);
      const isUp = (stock?.close ? price >= stock.close : isPositive);

      setTooltipState({
        visible: true,
        x: Math.min(width - 150, Math.max(10, param.point.x - 70)),
        y: Math.max(10, param.point.y - 65),
        price,
        time: formattedTime,
        isUp,
      });
    });

    chartRef.current = chart;

    // Repopulate data if available
    if (rawCandlesRef.current.length > 0) {
      const candles = rawCandlesRef.current;
      if (chartType === 'AREA' && areaSeriesRef.current) {
        const areaData = candles.map((c) => ({ time: c.time as any, value: c.close }));
        areaSeriesRef.current.setData(areaData);
      } else if (chartType === 'CANDLE' && candleSeriesRef.current) {
        candleSeriesRef.current.setData(candles as any);
      }

      const totalBars = candles.length;
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, totalBars - 75),
        to: totalBars + 5,
      });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth > 10 && newHeight > 10 && chartRef.current) {
        chartRef.current.applyOptions({ width: Math.floor(newWidth), height: Math.floor(newHeight) });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartType, isPositive, timeframe, stock?.close]);

  // Fetch candles on stock or timeframe update
  useEffect(() => {
    if (!stock) return;

    let unmounted = false;
    setIsLoading(true);

    getChartCandles(stock.symbol, timeframe)
      .then((rawCandles) => {
        if (unmounted) return;

        if (rawCandles && rawCandles.length > 0) {
          const sorted = [...rawCandles].sort((a, b) => a.time - b.time);
          const candles: CandleData[] = [];
          const seenTimes = new Set<number>();
          for (const c of sorted) {
            if (!seenTimes.has(c.time)) {
              seenTimes.add(c.time);
              candles.push(c);
            }
          }

          rawCandlesRef.current = candles;
          lastCandleRef.current = candles[candles.length - 1];

          if (chartType === 'AREA' && areaSeriesRef.current) {
            const areaData = candles.map((c) => ({ time: c.time as any, value: c.close }));
            areaSeriesRef.current.setData(areaData);
          } else if (chartType === 'CANDLE' && candleSeriesRef.current) {
            candleSeriesRef.current.setData(candles as any);
          }

          if (chartRef.current) {
            if (timeframe === '1D' || timeframe === '5D' || timeframe === '1M') {
              chartRef.current.timeScale().fitContent();
            } else {
              const totalBars = candles.length;
              chartRef.current.timeScale().setVisibleLogicalRange({
                from: Math.max(0, totalBars - 100),
                to: totalBars + 5,
              });
            }
          }
        }
      })
      .catch((err) => console.error('Error fetching candles:', err))
      .finally(() => {
        if (!unmounted) setIsLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, [stock?.symbol, timeframe, chartType]);

  // Real-time tick update on active bar
  useEffect(() => {
    if (!stock || !lastCandleRef.current) return;

    const last = lastCandleRef.current;
    const ltp = stock.ltp;
    const updatedCandle: CandleData = {
      time: last.time,
      open: last.open,
      high: Math.max(last.high, ltp),
      low: Math.min(last.low, ltp),
      close: ltp,
      volume: (last.volume || 1000) + 10,
    };

    lastCandleRef.current = updatedCandle;

    try {
      if (chartType === 'AREA' && areaSeriesRef.current) {
        areaSeriesRef.current.update({ time: last.time as any, value: ltp });
      } else if (chartType === 'CANDLE' && candleSeriesRef.current) {
        candleSeriesRef.current.update(updatedCandle as any);
      }
    } catch {
      // Ignore race conditions
    }
  }, [stock?.ltp, chartType]);

  if (!stock) {
    return (
      <div className="flex-1 flex items-center justify-center bg-obsidian-900 text-slate-500 text-sm">
        Select a stock from the watchlist to view chart
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-obsidian-900 overflow-hidden select-none">
      {/* Top Header Controls Bar */}
      <div className="px-4 py-2.5 bg-obsidian-800/95 border-b border-obsidian-700/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Timeframe Switcher matching Groww / Google Finance (1D, 5D, 1M, 1Y, 5Y, Max) */}
        <div className="flex items-center gap-1.5">
          {TIMEFRAMES.map((tf) => {
            const isActive = timeframe === tf.id;
            return (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                  isActive
                    ? 'bg-white text-obsidian-950 shadow-md shadow-white/10 ring-1 ring-white/20'
                    : 'text-slate-300 hover:text-white hover:bg-obsidian-700/70'
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>

        {/* Right: Symbol Info, Chart Type Toggle & BUY/SELL buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Symbol & Live LTP */}
          <div className="flex items-center gap-2 mr-1">
            <span className="font-black text-sm text-white">{stock.symbol}</span>
            <span className="font-tabular font-black text-sm text-white">
              ₹{stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({isPositive ? '+' : ''}{stock.pChange.toFixed(2)}%)
            </span>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-obsidian-900/90 p-0.5 rounded-xl border border-obsidian-700">
            <button
              onClick={() => setChartType('AREA')}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                chartType === 'AREA'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Line Chart"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Line</span>
            </button>
            <button
              onClick={() => setChartType('CANDLE')}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                chartType === 'CANDLE'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Candlestick Chart"
            >
              <CandlestickChart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Candles</span>
            </button>
          </div>

          {/* Buy & Sell Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenOrderModal(stock.symbol, 'BUY')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black shadow-md transition active:scale-95"
            >
              BUY
            </button>
            <button
              onClick={() => onOpenOrderModal(stock.symbol, 'SELL')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white text-xs font-black shadow-md transition active:scale-95"
            >
              SELL
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area with Floating Hover Card */}
      <div className="flex-1 relative w-full h-full min-h-[220px] overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-obsidian-900/80 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-obsidian-800 border border-obsidian-700 text-brand-cyan text-xs font-bold shadow-2xl">
              <BarChart2 className="w-4 h-4 animate-bounce" />
              <span>Loading {stock.symbol} ({timeframe}) chart...</span>
            </div>
          </div>
        )}

        {/* Floating Google Finance / Groww Style Tooltip on Hover */}
        {tooltipState && tooltipState.visible && (
          <div
            className="absolute z-20 pointer-events-none bg-obsidian-950/95 border border-obsidian-700/90 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-75"
            style={{
              left: `${tooltipState.x}px`,
              top: `${tooltipState.y}px`,
            }}
          >
            <div className={`font-tabular font-black text-sm ${tooltipState.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{tooltipState.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-300 font-medium">
              {tooltipState.time}
            </div>
          </div>
        )}

        <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />
      </div>

      {/* Bottom Metrics Strip (Exact 3-Column, 2-Row Layout matching the user screenshot) */}
      <div className="bg-obsidian-950/90 border-t border-obsidian-800/80 px-4 sm:px-6 py-2.5 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-6 sm:gap-x-12 max-w-4xl text-xs font-tabular">
          {/* Row 1 */}
          <div className="flex items-center justify-between border-b border-obsidian-800/60 pb-1.5">
            <span className="text-slate-400 font-medium">Previous Close</span>
            <span className="text-white font-extrabold text-xs sm:text-sm">
              ₹{stock.close.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-obsidian-800/60 pb-1.5">
            <span className="text-slate-400 font-medium">Open</span>
            <span className="text-white font-extrabold text-xs sm:text-sm">
              ₹{stock.open.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-obsidian-800/60 pb-1.5">
            <span className="text-slate-400 font-medium">High</span>
            <span className="text-white font-extrabold text-xs sm:text-sm">
              ₹{stock.high.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Row 2 */}
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-slate-400 font-medium">Low</span>
            <span className="text-white font-extrabold text-xs sm:text-sm">
              ₹{stock.low.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-slate-400 font-medium">52 Week High</span>
            <span className="text-white font-extrabold text-xs sm:text-sm">
              ₹{stock.high52 ? stock.high52.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-slate-400 font-medium">52 Week Low</span>
            <span className="text-white font-extrabold text-xs sm:text-sm">
              ₹{stock.low52 ? stock.low52.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
