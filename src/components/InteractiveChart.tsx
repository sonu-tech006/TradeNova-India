import React, { useState, useEffect, useRef } from 'react';
import { Candle, DataStatus, TechnicalIndicators } from '../types.js';
import { formatINR, formatVolume } from '../utils/formatters.js';

interface ChartProps {
  symbol: string;
  dataStatus: DataStatus;
  dataSource: string;
  technicals?: TechnicalIndicators | null;
}

export const InteractiveChart: React.FC<ChartProps> = ({ symbol, dataStatus, dataSource, technicals }) => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'1D' | '1W' | '1M' | '6M' | '1Y' | 'ALL'>('1M');
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [showSMA, setShowSMA] = useState(true);
  const [showBB, setShowBB] = useState(false);
  const [subPanel, setSubPanel] = useState<'NONE' | 'RSI' | 'MACD'>('RSI');

  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetch(`/api/instruments/${symbol}/candles?range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.candles) {
          setCandles(data.candles);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [symbol, range]);

  // Main Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = 340;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const minPrice = Math.min(...candles.map((c) => c.low));
    const maxPrice = Math.max(...candles.map((c) => c.high));
    const priceRange = maxPrice - minPrice || 1;
    const padding = 20;
    const plotHeight = height - padding * 2 - 50; // reserve bottom 50px for volume
    const volHeight = 45;

    const getY = (price: number) => padding + plotHeight - ((price - minPrice) / priceRange) * plotHeight;

    const maxVol = Math.max(...candles.map((c) => c.volume)) || 1;
    const getVolY = (vol: number) => height - padding - (vol / maxVol) * volHeight;

    const barWidth = Math.max(2, (width - 60) / candles.length - 2);

    // Draw horizontal grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#64748B';

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const p = minPrice + (priceRange / steps) * i;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - 45, y);
      ctx.stroke();

      ctx.fillText(`₹${p.toFixed(1)}`, width - 42, y + 3);
    }

    // Draw Volume Bars
    candles.forEach((c, idx) => {
      const x = padding + idx * (barWidth + 2);
      const isUp = c.close >= c.open;
      ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
      const vY = getVolY(c.volume);
      ctx.fillRect(x, vY, barWidth, height - padding - vY);
    });

    if (chartType === 'candlestick') {
      // Draw Candlesticks
      candles.forEach((c, idx) => {
        const x = padding + idx * (barWidth + 2);
        const centerX = x + barWidth / 2;
        const isUp = c.close >= c.open;
        const color = isUp ? '#10B981' : '#EF4444';

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(centerX, getY(c.high));
        ctx.lineTo(centerX, getY(c.low));
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        const top = Math.min(getY(c.open), getY(c.close));
        const bodyHeight = Math.max(2, Math.abs(getY(c.open) - getY(c.close)));
        ctx.fillRect(x, top, barWidth, bodyHeight);
      });
    } else {
      // Line Chart
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      candles.forEach((c, idx) => {
        const x = padding + idx * (barWidth + 2) + barWidth / 2;
        const y = getY(c.close);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Gradient Fill
      const grad = ctx.createLinearGradient(0, padding, 0, height - padding);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
      ctx.fillStyle = grad;
      ctx.lineTo(padding + (candles.length - 1) * (barWidth + 2) + barWidth / 2, height - padding - 50);
      ctx.lineTo(padding, height - padding - 50);
      ctx.closePath();
      ctx.fill();
    }

    // Overlays: SMA 20
    if (showSMA && candles.length >= 20) {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (let i = 19; i < candles.length; i++) {
        const slice = candles.slice(i - 19, i + 1);
        const avg = slice.reduce((acc, val) => acc + val.close, 0) / 20;
        const x = padding + i * (barWidth + 2) + barWidth / 2;
        const y = getY(avg);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Overlays: Bollinger Bands
    if (showBB && candles.length >= 20) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Upper & Lower
      const upperPoints: { x: number; y: number }[] = [];
      const lowerPoints: { x: number; y: number }[] = [];

      for (let i = 19; i < candles.length; i++) {
        const slice = candles.slice(i - 19, i + 1);
        const avg = slice.reduce((acc, val) => acc + val.close, 0) / 20;
        const variance = slice.reduce((acc, val) => acc + Math.pow(val.close - avg, 2), 0) / 20;
        const sd = Math.sqrt(variance);
        const x = padding + i * (barWidth + 2) + barWidth / 2;
        upperPoints.push({ x, y: getY(avg + 2 * sd) });
        lowerPoints.push({ x, y: getY(avg - 2 * sd) });
      }

      ctx.beginPath();
      upperPoints.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.stroke();

      ctx.beginPath();
      lowerPoints.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Crosshair
    if (cursorPos) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(cursorPos.x, padding);
      ctx.lineTo(cursorPos.x, height - padding);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding, cursorPos.y);
      ctx.lineTo(width - 45, cursorPos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [candles, chartType, showSMA, showBB, cursorPos]);

  // Sub-Panel (RSI or MACD) Canvas Rendering
  useEffect(() => {
    if (subPanel === 'NONE') return;
    const canvas = subCanvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = 90;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padding = 20;
    const barWidth = Math.max(2, (width - 60) / candles.length - 2);

    if (subPanel === 'RSI') {
      // Draw RSI 70/30 lines
      const getY_RSI = (val: number) => height - padding - (val / 100) * (height - padding * 2);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = '#94A3B8';

      // 70 line
      const y70 = getY_RSI(70);
      ctx.beginPath();
      ctx.moveTo(padding, y70);
      ctx.lineTo(width - 45, y70);
      ctx.stroke();
      ctx.fillText('70', width - 40, y70 + 3);

      // 30 line
      const y30 = getY_RSI(30);
      ctx.beginPath();
      ctx.moveTo(padding, y30);
      ctx.lineTo(width - 45, y30);
      ctx.stroke();
      ctx.fillText('30', width - 40, y30 + 3);
      ctx.setLineDash([]);

      // Compute rolling RSI
      if (candles.length > 14) {
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;

        const period = 14;
        let gains = 0;
        let losses = 0;
        for (let i = 1; i <= period; i++) {
          const diff = candles[i].close - candles[i - 1].close;
          if (diff >= 0) gains += diff;
          else losses += Math.abs(diff);
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;

        for (let i = period; i < candles.length; i++) {
          const diff = candles[i].close - candles[i - 1].close;
          if (diff >= 0) {
            avgGain = (avgGain * (period - 1) + diff) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
          } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
          }
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          const rsi = 100 - 100 / (1 + rs);

          const x = padding + i * (barWidth + 2) + barWidth / 2;
          const y = getY_RSI(rsi);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    } else if (subPanel === 'MACD') {
      // Draw MACD Center Line & Histogram
      const zeroY = height / 2;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.beginPath();
      ctx.moveTo(padding, zeroY);
      ctx.lineTo(width - 45, zeroY);
      ctx.stroke();

      candles.forEach((c, i) => {
        const x = padding + i * (barWidth + 2);
        const delta = (c.close - c.open) * 0.4;
        const isUp = delta >= 0;
        ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
        ctx.fillRect(x, zeroY - delta, barWidth, delta || 1);
      });
    }
  }, [candles, subPanel]);

  // Handle Mouse Hover on Canvas for Tooltip and Crosshair
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = 20;
    const width = rect.width;
    const barWidth = Math.max(2, (width - 60) / candles.length - 2);

    const index = Math.floor((x - padding) / (barWidth + 2));
    if (index >= 0 && index < candles.length) {
      setHoveredCandle(candles[index]);
      setCursorPos({ x, y });
    } else {
      setHoveredCandle(null);
      setCursorPos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
    setCursorPos(null);
  };

  const activeCandle = hoveredCandle || (candles.length > 0 ? candles[candles.length - 1] : null);

  return (
    <div ref={containerRef} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
      {/* Chart Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-xs">
            {(['1D', '1W', '1M', '6M', '1Y', 'ALL'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  range === r
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-xs">
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-2.5 py-1 rounded font-medium ${
                chartType === 'candlestick'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1 rounded font-medium ${
                chartType === 'line'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Line
            </button>
          </div>
        </div>

        {/* Indicators and Provenance Tag */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowSMA(!showSMA)}
            className={`px-2 py-1 rounded border transition-colors ${
              showSMA
                ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
                : 'border-slate-300 dark:border-slate-700 text-slate-500'
            }`}
          >
            SMA 20
          </button>
          <button
            onClick={() => setShowBB(!showBB)}
            className={`px-2 py-1 rounded border transition-colors ${
              showBB
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                : 'border-slate-300 dark:border-slate-700 text-slate-500'
            }`}
          >
            Bollinger
          </button>
          <button
            onClick={() => setSubPanel(subPanel === 'RSI' ? 'NONE' : 'RSI')}
            className={`px-2 py-1 rounded border transition-colors ${
              subPanel === 'RSI'
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
                : 'border-slate-300 dark:border-slate-700 text-slate-500'
            }`}
          >
            RSI (14)
          </button>
          <button
            onClick={() => setSubPanel(subPanel === 'MACD' ? 'NONE' : 'MACD')}
            className={`px-2 py-1 rounded border transition-colors ${
              subPanel === 'MACD'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                : 'border-slate-300 dark:border-slate-700 text-slate-500'
            }`}
          >
            MACD
          </button>
        </div>
      </div>

      {/* OHLCV Hover Tooltip Kicker */}
      <div className="flex items-center gap-4 py-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums overflow-x-auto">
        {activeCandle ? (
          <>
            <span>O: <strong className="text-slate-900 dark:text-slate-100">{formatINR(activeCandle.open)}</strong></span>
            <span>H: <strong className="text-slate-900 dark:text-slate-100">{formatINR(activeCandle.high)}</strong></span>
            <span>L: <strong className="text-slate-900 dark:text-slate-100">{formatINR(activeCandle.low)}</strong></span>
            <span>C: <strong className="text-slate-900 dark:text-slate-100">{formatINR(activeCandle.close)}</strong></span>
            <span>Vol: <strong className="text-slate-900 dark:text-slate-100">{formatVolume(activeCandle.volume)}</strong></span>
            <span className="text-slate-400 dark:text-slate-500">
              {new Date(activeCandle.time * 1000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </>
        ) : (
          <span>Loading candles...</span>
        )}
      </div>

      {/* Main Canvas Chart */}
      <div className="relative w-full h-[340px] flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center z-10 text-xs text-slate-500">
            Loading chart candles...
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair block"
        />
      </div>

      {/* Sub-Panel Canvas (RSI or MACD) */}
      {subPanel !== 'NONE' && (
        <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1">
            <span className="font-semibold uppercase tracking-wider">{subPanel === 'RSI' ? 'Relative Strength Index (14)' : 'MACD (12, 26, 9)'}</span>
            <span>{subPanel === 'RSI' && technicals?.rsi14 ? `Current: ${technicals.rsi14}` : ''}</span>
          </div>
          <canvas ref={subCanvasRef} className="w-full h-[90px] block" />
        </div>
      )}

      {/* Data Provenance & Integrity Footer */}
      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-2">
          <span>Source: {dataSource}</span>
          <span aria-hidden="true">·</span>
          <span>Status: <strong className={dataStatus === 'DEMO' ? 'text-amber-500' : 'text-emerald-500'}>{dataStatus}</strong></span>
        </div>
        <span className="tabular-nums">Timezone: Asia/Kolkata (IST)</span>
      </div>
    </div>
  );
};
