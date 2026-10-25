import React, { useState, useEffect } from 'react';
import { HoldingItem } from '../types.js';
import { formatINR, formatPercent } from '../utils/formatters.js';
import { useApp } from '../context/AppContext.js';
import { OrderTicketModal } from '../components/OrderTicketModal.js';

interface HoldingsPageProps {
  onOpenExplorer: () => void;
  onOpenChart: (symbol: string) => void;
}

export const HoldingsPage: React.FC<HoldingsPageProps> = ({ onOpenExplorer, onOpenChart }) => {
  const { paperAccount, token, refreshPaperAccount } = useApp();
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellHolding, setSellHolding] = useState<HoldingItem | null>(null);

  const fetchHoldings = () => {
    if (!token) return;
    setLoading(true);
    fetch('/api/paper/holdings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.holdings) setHoldings(data.holdings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHoldings();
  }, [token]);

  // Export CSV
  const handleExportCSV = () => {
    if (holdings.length === 0) return;
    const headers = ['Symbol', 'Quantity', 'Avg Price', 'Current Price', 'Current Value', 'P&L', 'P&L Pct'];
    const rows = holdings.map((h) => [
      h.symbol,
      h.quantity,
      h.averagePrice.toFixed(2),
      h.currentPrice.toFixed(2),
      h.currentValue.toFixed(2),
      h.pnl.toFixed(2),
      `${h.pnlPct.toFixed(2)}%`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tradenova_holdings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalInvested = holdings.reduce((acc, h) => acc + h.totalCost, 0);
  const totalCurrent = holdings.reduce((acc, h) => acc + h.currentValue, 0);
  const totalPnL = totalCurrent - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const totalDayChange = holdings.reduce((acc, h) => acc + (h.dayChange || 0), 0);

  return (
    <div className="space-y-6">
      {/* Portfolio Analytics Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Portfolio Holdings & Analytics</h1>
            <p className="text-xs text-slate-500 mt-1">
              Live tracking using average-cost accounting across recorded simulator executions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={holdings.length === 0}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={onOpenExplorer}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors"
            >
              Buy More Equities
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 font-mono">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Total Invested</span>
            <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block tabular-nums">
              {formatINR(totalInvested)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Current Market Value</span>
            <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block tabular-nums">
              {formatINR(totalCurrent)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Total Unrealized P&L</span>
            <span className={`text-lg font-black mt-0.5 block tabular-nums ${totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {totalPnL >= 0 ? '+' : ''}{formatINR(totalPnL)} ({formatPercent(totalPnLPct)})
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Today's P&L</span>
            <span className={`text-lg font-black mt-0.5 block tabular-nums ${totalDayChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {totalDayChange >= 0 ? '+' : ''}{formatINR(totalDayChange)}
            </span>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Positions ({holdings.length})</h3>
          <span className="text-xs text-slate-500">Method: Weighted Average Cost</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-medium">
                <th className="py-3 px-4">Instrument</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Avg Cost</th>
                <th className="py-3 px-4 text-right">LTP (₹)</th>
                <th className="py-3 px-4 text-right">Cur. Value</th>
                <th className="py-3 px-4 text-right">P&L</th>
                <th className="py-3 px-4 text-right">Day's Chg</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 font-sans">
                    Calculating portfolio holdings...
                  </td>
                </tr>
              ) : holdings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    No holdings in portfolio yet. Explore 260+ Indian stocks to submit your first virtual order.
                  </td>
                </tr>
              ) : (
                holdings.map((h) => {
                  const isUp = h.pnl >= 0;
                  return (
                    <tr key={h._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onOpenChart(h.symbol)}
                          className="font-bold text-slate-900 dark:text-white hover:text-emerald-500 transition-colors"
                        >
                          {h.symbol}
                        </button>
                        <span className="text-[10px] text-slate-400 block font-sans">NSE · {h.productType}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">{h.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 tabular-nums">{formatINR(h.averagePrice)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">{formatINR(h.currentPrice)}</td>
                      <td className="py-3 px-4 text-right text-slate-900 dark:text-white tabular-nums font-semibold">{formatINR(h.currentValue)}</td>
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isUp ? '+' : ''}{formatINR(h.pnl)} ({formatPercent(h.pnlPct)})
                      </td>
                      <td className={`py-3 px-4 text-right tabular-nums ${(h.dayChange || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {(h.dayChange || 0) >= 0 ? '+' : ''}{formatINR(h.dayChange || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {h.dataStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() => setSellHolding(h)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          Exit / Sell
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exit Order Ticket Modal */}
      {sellHolding && (
        <OrderTicketModal
          symbol={sellHolding.symbol}
          companyName={sellHolding.symbol}
          isOpen={true}
          onClose={() => setSellHolding(null)}
          onOrderExecuted={() => {
            fetchHoldings();
            refreshPaperAccount();
          }}
        />
      )}
    </div>
  );
};
