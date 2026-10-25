import React, { useState, useEffect } from 'react';
import { IndexQuote } from '../types.js';
import { formatINR } from '../utils/formatters.js';
import { useApp } from '../context/AppContext.js';

export const TopMarketBar: React.FC = () => {
  const { providerStatus } = useApp();
  const [indices, setIndices] = useState<IndexQuote[]>([]);
  const [marketSession, setMarketSession] = useState<{ isOpen: boolean; sessionState: string; istTimeString: string }>({
    isOpen: true,
    sessionState: 'REGULAR_SESSION',
    istTimeString: '',
  });

  useEffect(() => {
    const fetchIndices = () => {
      fetch('/api/market/indices')
        .then((res) => res.json())
        .then((data) => {
          if (data.indices) setIndices(data.indices);
        })
        .catch(() => {});

      fetch('/api/market/status')
        .then((res) => res.json())
        .then((data) => {
          setMarketSession(data);
        })
        .catch(() => {});
    };

    fetchIndices();
    const interval = setInterval(fetchIndices, 10000);
    return () => clearInterval(interval);
  }, []);

  const isDemo = providerStatus?.dataMode === 'DEMO';

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 text-slate-200">
      {/* Persistent Demo Data Mode Banner if active */}
      {isDemo && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-400">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider">DEMO DATA — NOT LIVE EXCHANGE PRICES</span>
            <span aria-hidden="true" className="text-amber-500/50">·</span>
            <span className="text-amber-300/80 hidden sm:inline">260+ Indian equities simulated from official NSE/BSE closing baselines</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-300 font-medium">Virtual Capital: ₹10,00,000</span>
          </div>
        </div>
      )}

      {/* Market Ticker Bar */}
      <div className="px-4 py-2 flex items-center justify-between gap-4 overflow-x-auto text-xs whitespace-nowrap">
        <div className="flex items-center gap-6">
          {indices.map((idx) => {
            const isUp = idx.change >= 0;
            return (
              <div key={idx.symbol} className="flex items-center gap-2 font-mono tabular-nums">
                <span className="font-semibold text-slate-300 text-[11px]">{idx.name}</span>
                <span className="font-bold text-white">{idx.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <span className={`text-[11px] font-medium ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isUp ? '+' : ''}{idx.change.toFixed(2)} ({isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%)
                </span>
              </div>
            );
          })}
        </div>

        {/* Market Status & IST Time */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0 font-mono">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${marketSession.isOpen ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span className={marketSession.isOpen ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
              {marketSession.isOpen ? 'NSE/BSE OPEN' : 'MARKET CLOSED'}
            </span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>{marketSession.istTimeString || 'Asia/Kolkata (IST)'}</span>
        </div>
      </div>
    </div>
  );
};
