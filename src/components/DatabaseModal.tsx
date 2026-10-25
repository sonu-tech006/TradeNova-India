import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose }) => {
  const { dbStatus, connectMongoDb, refreshDbStatus } = useApp();
  const [mongoUri, setMongoUri] = useState('');
  const [persistToEnv, setPersistToEnv] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const isAtlas = dbStatus?.type === 'MONGODB_ATLAS' && dbStatus?.isConnected;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mongoUri.trim()) {
      setResultMessage({ type: 'error', text: 'Please enter a valid MongoDB connection URI.' });
      return;
    }

    setLoading(true);
    setResultMessage(null);

    const res = await connectMongoDb(mongoUri.trim(), persistToEnv);
    setLoading(false);

    if (res.success) {
      setResultMessage({
        type: 'success',
        text: res.message || 'Successfully connected to MongoDB Atlas! TradeNova database synchronized.',
      });
      setMongoUri('');
    } else {
      setResultMessage({
        type: 'error',
        text: res.error || 'Failed to connect. Please check credentials, network IP access list, and URI formatting.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
              isAtlas ? 'bg-emerald-600' : 'bg-amber-500'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Database & MongoDB Configuration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Storage engine, schemas, and live persistence diagnostics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Current Database Status Card */}
          <div className={`p-4 rounded-xl border ${
            isAtlas
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isAtlas ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isAtlas ? 'MongoDB Atlas Live Database' : 'Local In-Memory Store (Resilient Fallback)'}
              </span>
              <button
                type="button"
                onClick={() => refreshDbStatus()}
                className="text-[11px] underline hover:opacity-80"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono mt-3">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-sans">Database</span>
                <span className="font-semibold">{dbStatus?.databaseName || 'tradenova'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-sans">Status</span>
                <span className="font-semibold">{isAtlas ? 'CONNECTED (ReadyState: 1)' : 'OPERATIONAL (In-Memory)'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-sans">Active Equities</span>
                <span className="font-semibold">{dbStatus?.stats?.instrumentsCount || '260+'} NSE/BSE</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-sans">Price Alerts Indexed</span>
                <span className="font-semibold">{dbStatus?.stats?.activeAlertsCount ?? 0}</span>
              </div>
            </div>

            {dbStatus?.connectionStringMasked && (
              <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-[11px] font-mono break-all text-slate-600 dark:text-slate-300">
                URI: {dbStatus.connectionStringMasked}
              </div>
            )}
          </div>

          {/* Feedback Banner */}
          {resultMessage && (
            <div className={`p-3 text-xs rounded-xl border flex items-start gap-2.5 ${
              resultMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}>
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {resultMessage.type === 'success' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <span>{resultMessage.text}</span>
            </div>
          )}

          {/* Connect Custom MongoDB URI Form */}
          <form onSubmit={handleConnect} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Connect New MongoDB Atlas Cluster
              </label>
              <input
                type="text"
                value={mongoUri}
                onChange={(e) => setMongoUri(e.target.value)}
                placeholder="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/tradenova?retryWrites=true&w=majority"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                You can also specify this in the project root <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">.env</code> file under <code className="text-emerald-600 dark:text-emerald-400 font-mono">MONGODB_URI</code>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="persistEnv"
                checked={persistToEnv}
                onChange={(e) => setPersistToEnv(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="persistEnv" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                Save URI into local <code className="font-mono">.env</code> file automatically
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Connect & Synchronize MongoDB
                </>
              )}
            </button>
          </form>

          {/* Quick Help Guide */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white block">
              Quick MongoDB Atlas Setup:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
              <li>Open your free cluster at <strong>cloud.mongodb.com</strong></li>
              <li>Click <strong>Connect</strong> &rarr; <strong>Drivers</strong> &rarr; Copy the connection string</li>
              <li>Ensure your IP is in <em>Network Access</em> (e.g. <code>0.0.0.0/0</code> for development)</li>
              <li>Paste here or into <code>.env</code> as <code>MONGODB_URI</code></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
