import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.js';

interface BackgroundTicker {
  symbol: string;
  name: string;
  price: number;
  change: number;
  isPositive: boolean;
  sector: string;
}

const TOP_INDIAN_COMPANIES: BackgroundTicker[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2942.50, change: 1.85, isPositive: true, sector: 'Energy' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: 4120.00, change: -0.45, isPositive: false, sector: 'IT' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', price: 1712.40, change: 1.15, isPositive: true, sector: 'Banking' },
  { symbol: 'INFY', name: 'Infosys Limited', price: 1890.10, change: 2.30, isPositive: true, sector: 'IT' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', price: 1245.80, change: 0.95, isPositive: true, sector: 'Banking' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Passenger', price: 985.60, change: 3.40, isPositive: true, sector: 'Auto' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', price: 1540.20, change: -0.20, isPositive: false, sector: 'Telecom' },
  { symbol: 'ITC', name: 'ITC Limited', price: 504.30, change: 0.60, isPositive: true, sector: 'FMCG' },
  { symbol: 'SBIN', name: 'State Bank of India', price: 835.90, change: 1.70, isPositive: true, sector: 'PSU Bank' },
  { symbol: 'LT', name: 'Larsen & Toubro', price: 3670.00, change: -0.80, isPositive: false, sector: 'Infra' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', price: 7420.00, change: 1.25, isPositive: true, sector: 'Finance' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India', price: 12650.00, change: 0.85, isPositive: true, sector: 'Auto' },
];

export const DynamicBackground: React.FC = () => {
  const { theme, backgroundActive } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!backgroundActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Floating financial candlesticks
    const candleCount = 20;
    const candles = Array.from({ length: candleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: -(Math.random() * 0.35 + 0.15),
      bodyHeight: Math.random() * 32 + 12,
      bodyWidth: Math.random() * 6 + 4,
      wickTop: Math.random() * 14 + 6,
      wickBottom: Math.random() * 14 + 6,
      isGreen: Math.random() > 0.45,
      alpha: Math.random() * 0.35 + 0.1,
    }));

    // Grid coordinates
    const gridSize = 56;
    let gridOffset = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Terminal Matrix Grid
      gridOffset = (gridOffset + 0.2) % gridSize;

      ctx.save();
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.2)' : 'rgba(203, 213, 225, 0.4)';

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = gridOffset; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Animated Ambient Aurora Glow
      const grad1 = ctx.createRadialGradient(
        width * 0.15,
        height * 0.25,
        10,
        width * 0.15,
        height * 0.25,
        width * 0.45
      );
      grad1.addColorStop(0, isDark ? 'rgba(16, 185, 129, 0.045)' : 'rgba(16, 185, 129, 0.035)');
      grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.85,
        height * 0.75,
        10,
        width * 0.85,
        height * 0.75,
        width * 0.45
      );
      grad2.addColorStop(0, isDark ? 'rgba(59, 130, 246, 0.04)' : 'rgba(59, 130, 246, 0.025)');
      grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // 3. Floating Financial Candlesticks
      for (const c of candles) {
        c.y += c.vy;
        if (c.y < -50) {
          c.y = height + 50;
          c.x = Math.random() * width;
        }

        const color = c.isGreen
          ? isDark ? `rgba(16, 185, 129, ${c.alpha})` : `rgba(5, 150, 105, ${c.alpha * 0.7})`
          : isDark ? `rgba(244, 63, 94, ${c.alpha})` : `rgba(225, 29, 72, ${c.alpha * 0.7})`;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1;

        // Draw Wick
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - c.wickTop);
        ctx.lineTo(c.x, c.y + c.bodyHeight + c.wickBottom);
        ctx.stroke();

        // Draw Body
        ctx.fillRect(c.x - c.bodyWidth / 2, c.y, c.bodyWidth, c.bodyHeight);
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme, backgroundActive]);

  if (!backgroundActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none" aria-hidden="true">
      {/* Interactive HTML5 Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-90 transition-opacity duration-700"
      />

      {/* Prominent Company Brand & Logo Watermark Centerpiece */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] dark:opacity-[0.05] pointer-events-none">
        <div className="flex flex-col items-center gap-4 text-center transform -rotate-12 scale-125">
          {/* Stylized Brand Logo Icon */}
          <div className="w-48 h-48 rounded-3xl border-4 border-emerald-500 flex items-center justify-center p-6">
            <svg className="w-full h-full text-emerald-500" viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <path strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" d="M20 70 L45 35 L60 55 L85 20" />
              <path strokeWidth="5" strokeLinecap="round" d="M68 20 H85 V37" />
              <circle cx="20" cy="70" r="4" fill="currentColor" />
              <circle cx="45" cy="35" r="4" fill="currentColor" />
              <circle cx="60" cy="55" r="4" fill="currentColor" />
              <circle cx="85" cy="20" r="5" fill="currentColor" />
            </svg>
          </div>
          <div className="font-black text-6xl tracking-tighter uppercase font-mono text-slate-900 dark:text-white">
            TradeNova
          </div>
          <div className="text-xl font-bold tracking-widest uppercase text-emerald-500 font-mono">
            Indian Equity Terminal &bull; NSE / BSE
          </div>
        </div>
      </div>

      {/* Floating Animated Market Ticker Stream with Company Names & Logos */}
      <div className="absolute top-12 left-0 right-0 overflow-hidden py-1 border-y border-slate-200/20 dark:border-slate-800/20 backdrop-blur-[1px] opacity-40 hover:opacity-90 transition-opacity pointer-events-none">
        <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
          {TOP_INDIAN_COMPANIES.concat(TOP_INDIAN_COMPANIES).map((comp, idx) => (
            <div
              key={`${comp.symbol}-${idx}`}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 shadow-2xs font-mono text-[11px]"
            >
              {/* Company Logo Badge */}
              <span className="w-5 h-5 rounded-md bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] flex items-center justify-center">
                {comp.symbol.slice(0, 2)}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {comp.name}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                ({comp.symbol})
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ₹{comp.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-[10px] font-bold ${comp.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {comp.isPositive ? '+' : ''}{comp.change}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
