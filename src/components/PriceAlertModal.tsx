import React, { useState, useEffect } from 'react';
import { formatINR } from '../utils/formatters.js';
import { useApp } from '../context/AppContext.js';

interface PriceAlertModalProps {
  symbol: string;
  currentPrice: number;
  isOpen: boolean;
  onClose: () => void;
  onAlertCreated?: () => void;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  symbol,
  currentPrice,
  isOpen,
  onClose,
  onAlertCreated,
}) => {
  const { token, refreshAlerts } = useApp();
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [threshold, setThreshold] = useState<number>(Number((currentPrice * 1.05).toFixed(2)));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial threshold when opening or when price changes
  useEffect(() => {
    if (currentPrice > 0) {
      if (condition === 'ABOVE') {
        setThreshold(Number((currentPrice * 1.05).toFixed(2)));
      } else {
        setThreshold(Number((currentPrice * 0.95).toFixed(2)));
      }
    }
  }, [symbol, currentPrice, isOpen]);

  if (!isOpen) return null;

  const diffPct =
    currentPrice > 0 ? Number((((threshold - currentPrice) / currentPrice) * 100).toFixed(2)) : 0;

  const handleApplyPreset = (pct: number) => {
    const newPrice = Number((currentPrice * (1 + pct / 100)).toFixed(2));
    setThreshold(newPrice);
    if (pct >= 0) {
      setCondition('ABOVE');
    } else {
      setCondition('BELOW');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (threshold <= 0) {
      setErrorMsg('Target threshold must be greater than ₹0');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol,
          condition,
          threshold,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create alert');
      }

      await refreshAlerts();
      if (onAlertCreated) onAlertCreated();
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden p-5 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Create Price Alert</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live alert for <strong className="text-slate-800 dark:text-slate-200">{symbol}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        {/* Current Market Price Reference */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg text-xs font-mono flex items-center justify-between">
          <span className="text-slate-500 font-sans">Current Price:</span>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
            {formatINR(currentPrice)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Condition Toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Alert Trigger Condition</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCondition('ABOVE');
                  if (threshold <= currentPrice) {
                    setThreshold(Number((currentPrice * 1.05).toFixed(2)));
                  }
                }}
                className={`py-2 px-3 rounded-lg border font-medium transition-colors ${
                  condition === 'ABOVE'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Crosses Above (&ge;)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCondition('BELOW');
                  if (threshold >= currentPrice) {
                    setThreshold(Number((currentPrice * 0.95).toFixed(2)));
                  }
                }}
                className={`py-2 px-3 rounded-lg border font-medium transition-colors ${
                  condition === 'BELOW'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Drops Below (&le;)
              </button>
            </div>
          </div>

          {/* Quick Delta Buttons */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Quick Target Offsets</label>
            <div className="grid grid-cols-6 gap-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => handleApplyPreset(-10)}
                className="py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400"
              >
                -10%
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(-5)}
                className="py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400"
              >
                -5%
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(-2)}
                className="py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400"
              >
                -2%
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(2)}
                className="py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
              >
                +2%
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(5)}
                className="py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
              >
                +5%
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(10)}
                className="py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
              >
                +10%
              </button>
            </div>
          </div>

          {/* Target Price Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-500">Target Threshold Price (₹)</label>
              <span
                className={`text-[11px] font-mono ${
                  diffPct > 0 ? 'text-emerald-500' : diffPct < 0 ? 'text-rose-500' : 'text-slate-400'
                }`}
              >
                {diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`} from current
              </span>
            </div>
            <input
              type="number"
              step="0.05"
              required
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Alert Strategy Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 52-week breakout, take-profit target"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-600 dark:text-rose-400 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Set Price Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
