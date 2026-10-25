import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';

export const SettingsPage: React.FC = () => {
  const {
    user,
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    providerStatus,
    refreshProviderStatus,
    refreshPaperAccount,
    dbStatus,
    setDbModalOpen,
    backgroundActive,
    toggleBackground,
  } = useApp();

  const [selectedProviderKey, setSelectedProviderKey] = useState<string>(
    providerStatus?.activeProvider || 'DEMO'
  );
  const [switching, setSwitching] = useState(false);
  const [switchFeedback, setSwitchFeedback] = useState<string | null>(null);

  const handleProviderSwitch = async (key: string) => {
    setSelectedProviderKey(key);
    setSwitching(true);
    setSwitchFeedback(null);
    try {
      const res = await fetch('/api/market/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: key }),
      });
      const data = await res.json();
      setSwitchFeedback(data.message || `Switched to ${key}`);
      await refreshProviderStatus();
    } catch (e: any) {
      setSwitchFeedback('Failed to switch provider');
    } finally {
      setSwitching(false);
    }
  };

  const handleResetFunds = async () => {
    if (confirm('Reset your virtual trading account back to ₹10,00,000 INR?')) {
      await fetch('/api/paper/reset', { method: 'POST' });
      await refreshPaperAccount();
      alert('Virtual cash balance restored to ₹10,00,000.');
    }
  };

  const accents = [
    { name: 'Emerald', hex: '#10B981' },
    { name: 'Electric Blue', hex: '#3B82F6' },
    { name: 'Violet', hex: '#8B5CF6' },
    { name: 'Amber Gold', hex: '#F59E0B' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">System & Account Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Customize terminal appearance, configure licensed market data feeds, and manage paper-trading preferences.
        </p>
      </div>

      {/* Theme & Visual Appearance */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          Interface Appearance
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Color Theme</label>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`p-3 rounded-lg border text-xs font-semibold capitalize flex items-center justify-center gap-2 transition-all ${
                    theme === t
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {t} Theme
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Accent Highlight Color</label>
            <div className="flex items-center gap-3">
              {accents.map((acc) => (
                <button
                  key={acc.name}
                  onClick={() => setAccentColor(acc.hex)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    accentColor === acc.hex
                      ? 'border-slate-900 dark:border-white ring-2 ring-slate-400 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: acc.hex }} />
                  {acc.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white">
                Live Animated Terminal Background
              </label>
              <p className="text-[11px] text-slate-500">
                Smooth ambient financial particle wave and cyber-grid animation.
              </p>
            </div>
            <button
              onClick={toggleBackground}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                backgroundActive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {backgroundActive ? 'Enabled (Running)' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>

      {/* Database & MongoDB Atlas Architecture */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Database & Persistence (MongoDB Atlas)</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Price alerts, user accounts, paper trading positions, and watchlists storage engine.
            </p>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
            dbStatus?.type === 'MONGODB_ATLAS' && dbStatus?.isConnected
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
          }`}>
            {dbStatus?.type === 'MONGODB_ATLAS' && dbStatus?.isConnected ? 'MongoDB Atlas Active' : 'Local In-Memory Fallback'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs font-mono">
          <div>
            <span className="text-slate-400 text-[10px] block font-sans">Connection State</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {dbStatus?.type === 'MONGODB_ATLAS' && dbStatus?.isConnected ? 'Atlas Connected (1)' : 'Local Resilient Store'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block font-sans">Database Name</span>
            <span className="font-bold text-slate-900 dark:text-white">{dbStatus?.databaseName || 'tradenova'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block font-sans">MongoDB URI in .env</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {dbStatus?.envConfigured ? 'Configured' : 'Optional / Ready'}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-500">
            Connect your own MongoDB cluster or supply <code className="text-emerald-600 dark:text-emerald-400 font-mono">MONGODB_URI</code> in <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">.env</code>.
          </p>
          <button
            onClick={() => setDbModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            Configure / Test MongoDB Connection
          </button>
        </div>
      </div>

      {/* Market Data Sources & Provenance Diagnostic */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Market Data Feed Architecture</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Provider adapters normalize real exchange ticks into a single unified high-frequency feed.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
            Current: {providerStatus?.activeProvider || 'DEMO'}
          </span>
        </div>

        {/* Diagnostic Status Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs font-mono">
          <div>
            <span className="text-slate-400 text-[10px] block font-sans">Active Engine</span>
            <span className="font-bold text-slate-900 dark:text-white">{providerStatus?.activeProvider}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block font-sans">Data Mode</span>
            <span className={`font-bold ${providerStatus?.dataMode === 'DEMO' ? 'text-amber-500' : 'text-emerald-500'}`}>
              {providerStatus?.dataMode}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block font-sans">Connection State</span>
            <span className="font-bold text-slate-900 dark:text-white">{providerStatus?.connectionStatus}</span>
          </div>
        </div>

        {/* Provider Switcher Tabs */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">Select Active Provider Adapter</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { key: 'GROWW', label: 'Groww API (1s Live Feed)' },
              { key: 'DEMO', label: 'Controlled Demo Feed' },
              { key: 'YAHOO', label: 'Yahoo NSE/BSE (Live Delayed)' },
              { key: 'TRUEDATA', label: 'TrueData Real-Time' },
              { key: 'KITE', label: 'Zerodha Kite Connect' },
            ].map((p) => (
              <button
                key={p.key}
                disabled={switching}
                onClick={() => handleProviderSwitch(p.key)}
                className={`py-2 px-3 rounded-lg border text-left font-medium transition-colors ${
                  selectedProviderKey === p.key
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {switchFeedback && (
            <p className="text-xs text-emerald-500 font-medium mt-2">{switchFeedback}</p>
          )}
        </div>

        {/* Integration Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-2">
          <span className="font-bold text-slate-800 dark:text-slate-200">Official Provider Setup Guide</span>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
            {providerStatus?.setupInstructions}
          </p>
          <a
            href={providerStatus?.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 hover:underline inline-block text-[11px] font-medium"
          >
            Open Provider Official API Documentation →
          </a>
        </div>
      </div>

      {/* Simulator Capital & Storage Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          Virtual Funds Management
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Reset Simulator Virtual Balance</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Restore your virtual trading account balance back to ₹10,00,000 INR and liquidate all paper positions.
            </p>
          </div>
          <button
            onClick={handleResetFunds}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            Reset to ₹10,00,000
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
          Active Profile & Security
        </h3>
        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 font-sans text-[10px] block">Full Name</span>
            <span className="text-slate-900 dark:text-white font-bold">{user?.name || 'Arjun Mehta'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-sans text-[10px] block">Email</span>
            <span className="text-slate-900 dark:text-white font-bold">{user?.email || 'trader@tradenova.in'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-sans text-[10px] block">Database Provenance</span>
            <span className="text-emerald-500 font-bold">MongoDB Atlas / Resilient Store</span>
          </div>
          <div>
            <span className="text-slate-400 font-sans text-[10px] block">Timezone</span>
            <span className="text-slate-900 dark:text-white font-bold">Asia/Kolkata (IST)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
