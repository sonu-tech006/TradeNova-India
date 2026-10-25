import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { formatINR } from '../utils/formatters.js';
import { PriceAlertItem } from '../types.js';
import { PriceAlertModal } from '../components/PriceAlertModal.js';

interface PriceAlertsPageProps {
  onOpenChart: (symbol: string) => void;
  onOpenTrade?: (symbol: string) => void;
}

export const PriceAlertsPage: React.FC<PriceAlertsPageProps> = ({ onOpenChart, onOpenTrade }) => {
  const { alerts, token, refreshAlerts } = useApp();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'TRIGGERED' | 'PAUSED'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [targetSymbol, setTargetSymbol] = useState('RELIANCE');
  const [targetPrice, setTargetPrice] = useState(2780);
  const [reactivateAlertId, setReactivateAlertId] = useState<string | null>(null);
  const [reactivatePrice, setReactivatePrice] = useState<number>(0);

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const triggeredAlerts = alerts.filter((a) => a.status === 'TRIGGERED');
  const pausedAlerts = alerts.filter((a) => a.status === 'PAUSED');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'ACTIVE') return a.status === 'ACTIVE';
    if (filter === 'TRIGGERED') return a.status === 'TRIGGERED';
    if (filter === 'PAUSED') return a.status === 'PAUSED';
    return true;
  });

  const handleTogglePause = async (alertId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/alerts/${alertId}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        refreshAlerts();
      }
    } catch (e) {}
  };

  const handleDelete = async (alertId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        refreshAlerts();
      }
    } catch (e) {}
  };

  const handleReactivate = async (alert: PriceAlertItem) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/alerts/${alert._id}/reactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          threshold: reactivatePrice > 0 ? reactivatePrice : alert.threshold,
        }),
      });
      if (res.ok) {
        setReactivateAlertId(null);
        refreshAlerts();
      }
    } catch (e) {}
  };

  const openNewAlert = (symbol: string, price: number) => {
    setTargetSymbol(symbol);
    setTargetPrice(price);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Price Alerts</h1>
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Monitoring
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time threshold triggers evaluated continuously against NSE/BSE market ticks.
            </p>
          </div>

          <button
            onClick={() => openNewAlert('RELIANCE', 2780)}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>+</span> Set New Alert
          </button>
        </div>

        {/* Metric Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Alerts</span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block tabular-nums">
              {alerts.length}
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Active Alerts</span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
              {activeAlerts.length}
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Triggered</span>
            <span className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5 block tabular-nums">
              {triggeredAlerts.length}
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Paused</span>
            <span className="text-xl font-bold font-mono text-slate-500 mt-0.5 block tabular-nums">
              {pausedAlerts.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'ALL'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('ACTIVE')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'ACTIVE'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Active ({activeAlerts.length})
        </button>
        <button
          onClick={() => setFilter('TRIGGERED')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'TRIGGERED'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Triggered ({triggeredAlerts.length})
        </button>
        <button
          onClick={() => setFilter('PAUSED')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'PAUSED'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Paused ({pausedAlerts.length})
        </button>
      </div>

      {/* Alerts Grid / List */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
            🔔
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">No alerts in this category</h3>
            <p className="text-xs text-slate-500 mt-1">
              Create a price alert to get notified the exact second a stock crosses your upside or downside target price.
            </p>
          </div>

          <div className="pt-2">
            <span className="text-xs text-slate-400 font-medium block mb-2">Popular Quick Presets:</span>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => openNewAlert('RELIANCE', 2850)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                RELIANCE &gt; ₹2,850
              </button>
              <button
                onClick={() => openNewAlert('TCS', 4150)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                TCS &gt; ₹4,150
              </button>
              <button
                onClick={() => openNewAlert('HDFCBANK', 1750)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                HDFCBANK &gt; ₹1,750
              </button>
              <button
                onClick={() => openNewAlert('ZOMATO', 270)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                ZOMATO &gt; ₹270
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlerts.map((alert) => {
            const isTriggered = alert.status === 'TRIGGERED';
            const isPaused = alert.status === 'PAUSED';
            const isAbove = alert.condition === 'ABOVE';
            const currentPrice = alert.currentPrice || alert.lastEvaluatedPrice || alert.threshold;
            const distance = alert.distancePct || 0;

            return (
              <div
                key={alert._id}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs transition-all space-y-3.5 relative overflow-hidden ${
                  isTriggered
                    ? 'border-purple-500/40 dark:border-purple-900/60'
                    : isPaused
                    ? 'border-slate-200 dark:border-slate-800 opacity-60'
                    : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                {/* Top Row: Symbol, Exchange & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenChart(alert.symbol)}
                      className="font-bold text-base text-slate-900 dark:text-white hover:text-emerald-500 transition-colors tracking-wide font-mono"
                    >
                      {alert.symbol}
                    </button>
                    <span className="text-[10px] text-slate-400 uppercase font-sans">NSE</span>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded font-sans ${
                      isTriggered
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : isPaused
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {alert.status}
                  </span>
                </div>

                {/* Condition & Target Price Block */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-500 font-sans">
                    <span>Condition:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {isAbove ? 'Crosses Above (≥)' : 'Drops Below (≤)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans">Target Price:</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                      {formatINR(alert.threshold)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 font-sans">Live Market Price:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {formatINR(currentPrice)}
                    </span>
                  </div>
                </div>

                {/* Live Distance or Trigger Timestamp */}
                <div className="text-xs">
                  {isTriggered ? (
                    <div className="p-2 bg-purple-50/60 dark:bg-purple-950/20 rounded border border-purple-200/50 dark:border-purple-900/40 text-[11px] text-purple-700 dark:text-purple-300">
                      Triggered at <strong>{formatINR(alert.lastEvaluatedPrice || alert.threshold)}</strong>
                      {alert.triggeredAt && (
                        <span className="block text-[10px] opacity-80 mt-0.5">
                          on {new Date(alert.triggeredAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-sans">Distance to Target:</span>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          distance > 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {distance > 0 ? `+${distance}%` : `${distance}%`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Strategy Note */}
                {alert.note && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded">
                    &quot;{alert.note}&quot;
                  </p>
                )}

                {/* Reactivate Panel if open */}
                {reactivateAlertId === alert._id && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                    <label className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 block">
                      New Target Threshold (₹):
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.05"
                        defaultValue={alert.threshold}
                        onChange={(e) => setReactivatePrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                      <button
                        onClick={() => handleReactivate(alert)}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setReactivateAlertId(null)}
                        className="px-2 py-1 text-xs text-slate-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-sans">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenChart(alert.symbol)}
                      className="px-2.5 py-1 text-[11px] font-medium border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                      title="Open Stock Chart"
                    >
                      Chart
                    </button>
                    {onOpenTrade && (
                      <button
                        onClick={() => onOpenTrade(alert.symbol)}
                        className="px-2.5 py-1 text-[11px] font-medium border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        Trade
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isTriggered ? (
                      <button
                        onClick={() => {
                          setReactivateAlertId(alert._id);
                          setReactivatePrice(alert.threshold);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
                      >
                        Reset / Re-arm
                      </button>
                    ) : (
                      <button
                        onClick={() => handleTogglePause(alert._id)}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        {isPaused ? 'Resume' : 'Pause'}
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(alert._id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete alert"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Price Alert Creation Modal */}
      {isCreateModalOpen && (
        <PriceAlertModal
          symbol={targetSymbol}
          currentPrice={targetPrice}
          isOpen={true}
          onClose={() => setIsCreateModalOpen(false)}
          onAlertCreated={() => {
            refreshAlerts();
          }}
        />
      )}
    </div>
  );
};
