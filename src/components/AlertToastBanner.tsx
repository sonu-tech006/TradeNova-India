import React from 'react';
import { useApp } from '../context/AppContext.js';
import { formatINR } from '../utils/formatters.js';

interface AlertToastBannerProps {
  onOpenChart?: (symbol: string) => void;
  onOpenAlerts?: () => void;
}

export const AlertToastBanner: React.FC<AlertToastBannerProps> = ({ onOpenChart, onOpenAlerts }) => {
  const { alertToast, dismissAlertToast } = useApp();

  if (!alertToast) return null;

  return (
    <div className="fixed top-16 right-4 z-50 max-w-md w-full bg-slate-900 dark:bg-slate-900 text-white border-2 border-emerald-500 rounded-xl shadow-2xl p-4 animate-in slide-in-from-top-4 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-lg">
          🔔
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-white">{alertToast.symbol}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
              TARGET TRIGGERED
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Price crossed {alertToast.condition === 'ABOVE' ? 'above' : 'below'} your target of{' '}
            <strong className="text-white font-mono">{formatINR(alertToast.threshold)}</strong>.{' '}
            Current Price: <strong className="text-emerald-400 font-mono">{formatINR(alertToast.triggeredPrice)}</strong>
          </p>

          <div className="flex items-center gap-2 mt-3">
            {onOpenChart && (
              <button
                onClick={() => {
                  onOpenChart(alertToast.symbol);
                  dismissAlertToast();
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
              >
                Open Chart
              </button>
            )}
            {onOpenAlerts && (
              <button
                onClick={() => {
                  onOpenAlerts();
                  dismissAlertToast();
                }}
                className="px-2.5 py-1 text-xs font-medium border border-slate-700 hover:bg-slate-800 text-slate-300 rounded transition-colors"
              >
                View Alerts
              </button>
            )}
            <button
              onClick={dismissAlertToast}
              className="ml-auto text-xs text-slate-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={dismissAlertToast}
          className="text-slate-400 hover:text-white text-sm shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
