import React, { useState, useEffect } from 'react';
import { InstrumentItem, MarketQuote, TechnicalIndicators } from '../types.js';
import { InteractiveChart } from '../components/InteractiveChart.js';
import { OrderTicketModal } from '../components/OrderTicketModal.js';
import { PriceAlertModal } from '../components/PriceAlertModal.js';
import { formatINR, formatVolume, formatPercent, formatCrores } from '../utils/formatters.js';

interface StockDetailPageProps {
  symbol: string;
  onBack: () => void;
  onOpenAI: (symbol: string) => void;
}

export const StockDetailPage: React.FC<StockDetailPageProps> = ({ symbol, onBack, onOpenAI }) => {
  const [instrument, setInstrument] = useState<InstrumentItem | null>(null);
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [technicals, setTechnicals] = useState<TechnicalIndicators | null>(null);
  const [loading, setLoading] = useState(true);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetch(`/api/instruments/${symbol}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.instrument) {
          setInstrument(data.instrument);
          setQuote(data.quote);
        }
      })
      .catch(() => {});

    fetch(`/api/instruments/${symbol}/technicals`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.technicals) {
          setTechnicals(data.technicals);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [symbol]);

  if (loading && !instrument) {
    return (
      <div className="py-20 text-center text-slate-400">
        Loading instrument data for {symbol}...
      </div>
    );
  }

  const currentPrice = quote?.price || instrument?.basePrice || 0;
  const change = quote?.change || 0;
  const changePct = quote?.changePercent || 0;
  const isUp = change >= 0;

  return (
    <div className="space-y-6">
      {/* Back button & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2 transition-colors"
          >
            ← Back to Stock Explorer
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-wide">{symbol}</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {instrument?.exchange || 'NSE'}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {instrument?.sector}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">{instrument?.companyName} · ISIN: {instrument?.isin}</p>
        </div>

        {/* Live Price & Fast Order Ticket */}
        <div className="flex items-center gap-5">
          <div className="text-right font-mono tabular-nums">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {formatINR(currentPrice)}
            </div>
            <div className={`text-xs font-semibold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isUp ? '+' : ''}{change.toFixed(2)} ({formatPercent(changePct)})
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onOpenAI(symbol)}
              className="px-3.5 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-lg hover:bg-purple-100 transition-colors shadow-xs"
            >
              Ask AI Analysis
            </button>
            <button
              onClick={() => setAlertModalOpen(true)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Set Alert
            </button>
            <button
              onClick={() => setOrderModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors"
            >
              Trade Stock
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Candlestick Chart */}
      <InteractiveChart
        symbol={symbol}
        dataStatus={quote?.dataStatus || 'DEMO'}
        dataSource={quote?.dataSource || 'TradeNova Market Feed'}
        technicals={technicals}
      />

      {/* Key Stats and Technical Indicator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-500 block uppercase tracking-wider font-sans">Market Capitalization</span>
          <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
            {formatCrores(instrument?.marketCapCr)}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block font-sans">Ranked amongst large-cap Indian equities</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-500 block uppercase tracking-wider font-sans">Day Range (High / Low)</span>
          <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
            {formatINR(quote?.high || currentPrice * 1.01)} / {formatINR(quote?.low || currentPrice * 0.99)}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block font-sans">Session Range</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-500 block uppercase tracking-wider font-sans">RSI Momentum (14)</span>
          <span className={`text-base font-bold mt-1 block ${
            (technicals?.rsi14 || 50) > 70 ? 'text-amber-500' : (technicals?.rsi14 || 50) < 30 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
          }`}>
            {technicals?.rsi14 || '52.4'}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block font-sans">
            {(technicals?.rsi14 || 50) > 70 ? 'Overbought territory' : (technicals?.rsi14 || 50) < 30 ? 'Oversold accumulation' : 'Neutral zone'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-500 block uppercase tracking-wider font-sans">Volume Traded</span>
          <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
            {formatVolume(quote?.volume || 1450000)}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block font-sans">Shares changed hands today</span>
        </div>
      </div>

      {/* Company Description */}
      {instrument?.description && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">About {instrument.companyName}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {instrument.description}
          </p>
        </div>
      )}

      {/* Modals */}
      {orderModalOpen && (
        <OrderTicketModal
          symbol={symbol}
          companyName={instrument?.companyName || symbol}
          quote={quote}
          isOpen={true}
          onClose={() => setOrderModalOpen(false)}
        />
      )}

      {alertModalOpen && (
        <PriceAlertModal
          symbol={symbol}
          currentPrice={currentPrice}
          isOpen={true}
          onClose={() => setAlertModalOpen(false)}
        />
      )}
    </div>
  );
};
