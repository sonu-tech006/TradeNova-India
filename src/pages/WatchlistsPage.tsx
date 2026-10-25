import React, { useState, useEffect } from 'react';
import { WatchlistItem, PriceAlertItem, MarketQuote } from '../types.js';
import { formatINR, formatPercent } from '../utils/formatters.js';
import { useApp } from '../context/AppContext.js';
import { OrderTicketModal } from '../components/OrderTicketModal.js';

interface WatchlistsPageProps {
  onOpenChart: (symbol: string) => void;
  onOpenExplorer: () => void;
}

export const WatchlistsPage: React.FC<WatchlistsPageProps> = ({ onOpenChart, onOpenExplorer }) => {
  const { token, refreshPaperAccount } = useApp();

  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  const [activeWlId, setActiveWlId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [alerts, setAlerts] = useState<PriceAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Watchlist dialog
  const [showNewWlInput, setShowNewWlInput] = useState(false);
  const [newWlName, setNewWlName] = useState('');

  // Quick Trade ticket
  const [tradeSymbol, setTradeSymbol] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [wlRes, alertsRes] = await Promise.all([
        fetch('/api/watchlists', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/alerts', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (wlRes.ok) {
        const data = await wlRes.json();
        const list: WatchlistItem[] = data.watchlists || [];
        setWatchlists(list);
        if (list.length > 0 && !activeWlId) {
          setActiveWlId(list[0]._id);
        }
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Fetch quotes for active watchlist symbols
  const activeWl = watchlists.find((w) => w._id === activeWlId) || watchlists[0];

  useEffect(() => {
    if (activeWl && activeWl.symbols.length > 0) {
      fetch('/api/instruments/batch-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: activeWl.symbols }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.quotes) setQuotes(data.quotes);
        })
        .catch(() => {});
    }
  }, [activeWlId, activeWl?.symbols]);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWlName.trim()) return;

    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newWlName.trim(), symbols: [] }),
      });
      if (res.ok) {
        setNewWlName('');
        setShowNewWlInput(false);
        fetchData();
      }
    } catch (e) {}
  };

  const handleRemoveSymbol = async (symbol: string) => {
    if (!activeWl) return;
    const updatedSymbols = activeWl.symbols.filter((s) => s !== symbol);
    try {
      await fetch(`/api/watchlists/${activeWl._id}/symbols`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symbols: updatedSymbols }),
      });
      fetchData();
    } catch (e) {}
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Watchlists & Price Alerts</h1>
            <p className="text-xs text-slate-500 mt-1">
              Curate custom stock baskets and configure threshold price notifications.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewWlInput(true)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              + Create Watchlist
            </button>
            <button
              onClick={onOpenExplorer}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors"
            >
              Add Stocks
            </button>
          </div>
        </div>

        {/* Watchlist Tabs Bar */}
        <div className="flex items-center gap-2 pt-4 overflow-x-auto border-t border-slate-100 dark:border-slate-800 mt-4 text-xs">
          {watchlists.map((wl) => (
            <button
              key={wl._id}
              onClick={() => setActiveWlId(wl._id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeWl?._id === wl._id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {wl.name} ({wl.symbols.length})
            </button>
          ))}
        </div>

        {showNewWlInput && (
          <form onSubmit={handleCreateWatchlist} className="flex gap-2 pt-3">
            <input
              type="text"
              placeholder="Watchlist Name (e.g. EV & Solar Leaders)..."
              value={newWlName}
              onChange={(e) => setNewWlName(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-bold"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowNewWlInput(false)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-md text-xs"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Watchlist Instruments Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {activeWl?.name || 'Watchlist'} ({activeWl?.symbols.length || 0} Stocks)
            </h3>
            <span className="text-xs text-slate-400">Streamed quotes with data status</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-sans font-medium">
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4 text-right">Last Price</th>
                  <th className="py-3 px-4 text-right">Change</th>
                  <th className="py-3 px-4 text-right">% Change</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {!activeWl || activeWl.symbols.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                      This watchlist is empty.{' '}
                      <button onClick={onOpenExplorer} className="text-emerald-500 font-medium hover:underline">
                        Explore 260+ Indian stocks to add items.
                      </button>
                    </td>
                  </tr>
                ) : (
                  activeWl.symbols.map((sym) => {
                    const q = quotes[sym];
                    const price = q ? q.price : 0;
                    const change = q ? q.change : 0;
                    const changePct = q ? q.changePercent : 0;
                    const isUp = change >= 0;

                    return (
                      <tr key={sym} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onOpenChart(sym)}
                            className="font-bold text-slate-900 dark:text-white hover:text-emerald-500 transition-colors"
                          >
                            {sym}
                          </button>
                          <span className="text-[10px] text-slate-400 block font-sans">NSE</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatINR(price)}
                        </td>
                        <td className={`py-3 px-4 text-right tabular-nums ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isUp ? '+' : ''}{change.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-right tabular-nums font-bold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {formatPercent(changePct)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {q?.dataStatus || 'DEMO'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setTradeSymbol(sym)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors"
                            >
                              Trade
                            </button>
                            <button
                              onClick={() => handleRemoveSymbol(sym)}
                              className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                              title="Remove from watchlist"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Price Alerts Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Price Alerts ({alerts.length})</h3>
            <span className="text-[11px] text-slate-400">Server Evaluated</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[460px]">
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No active alerts set. Click "Alert" on any stock in Explorer to receive price triggers.
              </p>
            ) : (
              alerts.map((al) => (
                <div
                  key={al._id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs font-mono space-y-1 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{al.symbol}</span>
                    <button
                      onClick={() => handleDeleteAlert(al._id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors text-[10px]"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Condition: <strong className="text-slate-700 dark:text-slate-300">{al.condition}</strong> {formatINR(al.threshold)}
                  </div>
                  {al.note && <div className="text-[10px] text-slate-400 italic font-sans">{al.note}</div>}
                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span
                      className={`px-1.5 py-0.2 rounded font-sans font-semibold ${
                        al.status === 'TRIGGERED' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}
                    >
                      {al.status}
                    </span>
                    <span className="text-slate-400">
                      {new Date(al.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {tradeSymbol && (
        <OrderTicketModal
          symbol={tradeSymbol}
          companyName={tradeSymbol}
          quote={quotes[tradeSymbol]}
          isOpen={true}
          onClose={() => setTradeSymbol(null)}
          onOrderExecuted={() => refreshPaperAccount()}
        />
      )}
    </div>
  );
};
