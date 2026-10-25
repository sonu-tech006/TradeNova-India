import React, { useState, useEffect } from 'react';
import { InstrumentItem, MarketNewsItem } from '../types.js';
import { formatINR, formatPercent, formatVolume } from '../utils/formatters.js';
import { CompanyLogo } from '../components/CompanyLogo.js';
import { useApp } from '../context/AppContext.js';

interface OverviewPageProps {
  onOpenExplorer: () => void;
  onOpenChart: (symbol: string) => void;
  onOpenAI: (symbol: string) => void;
  onOpenPaperTrading: () => void;
  onOpenHoldings: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onOpenExplorer,
  onOpenChart,
  onOpenAI,
  onOpenPaperTrading,
  onOpenHoldings,
}) => {
  const { paperAccount, setAddFundsModalOpen } = useApp();
  const [topMovers, setTopMovers] = useState<InstrumentItem[]>([]);
  const [news, setNews] = useState<MarketNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    // Fetch popular stocks from explorer
    fetch('/api/instruments?limit=12&sortBy=marketCapCr&sortOrder=desc')
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.instruments) {
          setTopMovers(data.instruments);
        }
      })
      .catch(() => {});

    // Fetch news
    fetch('/api/market/news')
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.news) {
          setNews(data.news);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const gainers = [...topMovers].sort((a, b) => (b.quote?.changePercent || 0) - (a.quote?.changePercent || 0)).slice(0, 5);
  const losers = [...topMovers].sort((a, b) => (a.quote?.changePercent || 0) - (b.quote?.changePercent || 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero Financial Terminal Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
                Indian Equities Live & Demo Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              See the Market. Understand the Move.
            </h1>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Explore 260+ listed NSE and BSE equities with verified symbols across 35+ economic sectors, technical candlestick charts, paper trading, and Gemini AI analysis.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={onOpenExplorer}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
              >
                Open 260+ Stock Universe
              </button>
              <button
                onClick={() => onOpenAI('RELIANCE')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
              >
                Launch Gemini AI Research
              </button>
              <button
                onClick={onOpenPaperTrading}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg transition-colors"
              >
                View Virtual Order Book
              </button>
            </div>
          </div>

          {/* Quick Portfolio Snapshot Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 min-w-[280px] font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">
              Virtual Simulator Portfolio
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
              {formatINR(paperAccount?.portfolioTotalValue || 1000000)}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Available Cash</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatINR(paperAccount?.availableCash || 1000000)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Unrealized P&L</span>
                <span className={`font-bold tabular-nums ${(paperAccount?.totalUnrealizedPnL || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {(paperAccount?.totalUnrealizedPnL || 0) >= 0 ? '+' : ''}{formatINR(paperAccount?.totalUnrealizedPnL || 0)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setAddFundsModalOpen(true)}
                className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs font-sans"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Funds (Card/UPI)</span>
              </button>
              <button
                onClick={onOpenHoldings}
                className="py-1.5 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors font-sans"
              >
                Holdings →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Gainers & Losers Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Market Gainers</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">NSE Large-Cap</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
            {gainers.map((st) => {
              const q = st.quote;
              return (
                <div key={st.symbol} className="py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-1 rounded transition-colors">
                  <div className="flex items-center gap-2.5">
                    <CompanyLogo symbol={st.symbol} size="sm" />
                    <div>
                      <button
                        onClick={() => onOpenChart(st.symbol)}
                        className="font-bold text-slate-900 dark:text-white hover:text-emerald-500 transition-colors"
                      >
                        {st.symbol}
                      </button>
                      <span className="text-[11px] text-slate-400 font-sans block truncate max-w-[150px]">{st.companyName}</span>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="font-bold text-slate-900 dark:text-white block">{formatINR(q?.price || st.basePrice)}</span>
                    <span className="text-emerald-500 font-semibold text-[11px]">
                      +{q?.change.toFixed(2) || '0.00'} ({formatPercent(q?.changePercent || 0)})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Losers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Market Losers</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">NSE Large-Cap</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
            {losers.map((st) => {
              const q = st.quote;
              return (
                <div key={st.symbol} className="py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-1 rounded transition-colors">
                  <div className="flex items-center gap-2.5">
                    <CompanyLogo symbol={st.symbol} size="sm" />
                    <div>
                      <button
                        onClick={() => onOpenChart(st.symbol)}
                        className="font-bold text-slate-900 dark:text-white hover:text-rose-500 transition-colors"
                      >
                        {st.symbol}
                      </button>
                      <span className="text-[11px] text-slate-400 font-sans block truncate max-w-[150px]">{st.companyName}</span>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="font-bold text-slate-900 dark:text-white block">{formatINR(q?.price || st.basePrice)}</span>
                    <span className="text-rose-500 font-semibold text-[11px]">
                      {q?.change.toFixed(2) || '0.00'} ({formatPercent(q?.changePercent || 0)})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Market News Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Indian Market Wire & Financial News</h3>
            <p className="text-[11px] text-slate-500">Live headlines spanning monetary policy, corporate earnings, and infrastructure</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {news.map((item) => (
            <div
              key={item.id}
              className="p-4 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-slate-200 dark:hover:border-slate-700 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-600 dark:text-slate-300 font-sans">{item.source}</span>
                <span>{new Date(item.publishedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">{item.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{item.summary}</p>
              <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono">
                {item.relatedSymbols.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => onOpenChart(sym)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-500"
                  >
                    ${sym}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
