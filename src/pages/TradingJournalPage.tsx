import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types.js';
import { formatINR } from '../utils/formatters.js';
import { useApp } from '../context/AppContext.js';

export const TradingJournalPage: React.FC = () => {
  const { token } = useApp();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // New Journal Form Modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [thesis, setThesis] = useState('');
  const [entryReason, setEntryReason] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [strategyTag, setStrategyTag] = useState('Momentum Breakout');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [pnl, setPnl] = useState<string>('');

  const fetchJournal = () => {
    if (!token) return;
    setLoading(true);
    fetch('/api/journal', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.entries) setEntries(data.entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJournal();
  }, [token]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !thesis || !entryReason) return;

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          thesis,
          entryReason,
          exitReason,
          strategyTags: [strategyTag],
          lessonsLearned,
          pnl: pnl ? parseFloat(pnl) : undefined,
        }),
      });

      if (res.ok) {
        setShowAddForm(false);
        setSymbol('');
        setThesis('');
        setEntryReason('');
        setExitReason('');
        setLessonsLearned('');
        setPnl('');
        fetchJournal();
      }
    } catch (e) {}
  };

  // Performance calculations
  const totalTrades = entries.length;
  const closedWithPnL = entries.filter((e) => e.pnl !== undefined && e.pnl !== null);
  const winningTrades = closedWithPnL.filter((e) => (e.pnl || 0) > 0);
  const winRate = closedWithPnL.length > 0 ? (winningTrades.length / closedWithPnL.length) * 100 : 0;
  const cumulativePnL = closedWithPnL.reduce((acc, e) => acc + (e.pnl || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Trading Journal & Performance</h1>
            <p className="text-xs text-slate-500 mt-1">
              Document investment hypotheses, review emotional discipline, and audit trade execution.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            + New Journal Log
          </button>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 font-mono">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Logged Theses</span>
            <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block tabular-nums">
              {totalTrades}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Historical Win Rate</span>
            <span className="text-lg font-black text-emerald-500 mt-0.5 block tabular-nums">
              {winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400 font-sans block">{winningTrades.length} of {closedWithPnL.length} profitable</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Cumulative Realized P&L</span>
            <span className={`text-lg font-black mt-0.5 block tabular-nums ${cumulativePnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {cumulativePnL >= 0 ? '+' : ''}{formatINR(cumulativePnL)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Discipline Factor</span>
            <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block tabular-nums">
              100%
            </span>
            <span className="text-[10px] text-slate-400 font-sans block">Paper audit compliance</span>
          </div>
        </div>
      </div>

      {/* Journal Entries List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading journal records...</div>
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            No journal entries recorded yet. Click "+ New Journal Log" to log your rationale for current stock positions.
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">{entry.symbol}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                    {entry.strategyTags?.[0] || 'Discretionary'}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  {entry.pnl !== undefined && (
                    <span className={`font-bold ${entry.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {entry.pnl >= 0 ? '+' : ''}{formatINR(entry.pnl)}
                    </span>
                  )}
                  <span className="text-slate-400 text-[11px]">
                    {new Date(entry.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Trade Thesis</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{entry.thesis}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Entry Catalyst</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{entry.entryReason}</p>
                </div>
              </div>

              {entry.lessonsLearned && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Lessons Learned</span>
                  <p className="text-slate-600 dark:text-slate-400 italic">{entry.lessonsLearned}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Record Trading Thesis</h3>
            <form onSubmit={handleAddEntry} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Stock Symbol</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RELIANCE"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Strategy</label>
                  <select
                    value={strategyTag}
                    onChange={(e) => setStrategyTag(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                  >
                    <option value="Momentum Breakout">Momentum Breakout</option>
                    <option value="Value Reversal">Value Reversal</option>
                    <option value="Earnings Catalyst">Earnings Catalyst</option>
                    <option value="Long Term Compounder">Long Term Compounder</option>
                    <option value="Technical Support Bounce">Technical Support Bounce</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-medium">Trade Thesis</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Why did you take this position? What is the edge or fundamental catalyst?"
                  value={thesis}
                  onChange={(e) => setThesis(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Entry Condition</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Above 20 EMA with volume"
                    value={entryReason}
                    onChange={(e) => setEntryReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Realized P&L in ₹ (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 4500"
                    value={pnl}
                    onChange={(e) => setPnl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-medium">Lessons Learned</label>
                <textarea
                  rows={2}
                  placeholder="Key takeaway regarding entry timing, risk sizing, or market trend..."
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
