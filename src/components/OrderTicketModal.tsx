import React, { useState } from 'react';
import { MarketQuote } from '../types.js';
import { formatINR } from '../utils/formatters.js';
import { useApp } from '../context/AppContext.js';

interface OrderTicketModalProps {
  symbol: string;
  companyName: string;
  quote?: MarketQuote | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderExecuted?: () => void;
}

export const OrderTicketModal: React.FC<OrderTicketModalProps> = ({
  symbol,
  companyName,
  quote,
  isOpen,
  onClose,
  onOrderExecuted,
}) => {
  const { paperAccount, token, refreshPaperAccount, refreshNotifications } = useApp();

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [productType, setProductType] = useState<'CNC' | 'MIS'>('CNC');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'STOP_LOSS'>('MARKET');
  const [quantity, setQuantity] = useState<number>(10);
  const [limitPrice, setLimitPrice] = useState<number>(quote?.price || 100);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPrice = quote?.price || limitPrice;
  const effectivePrice = orderType === 'MARKET' ? currentPrice : limitPrice;
  const orderValue = effectivePrice * quantity;
  const estimatedCharges = Number((orderValue * 0.0013).toFixed(2));
  const totalRequired = orderValue + estimatedCharges;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/paper/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol,
          side,
          productType,
          orderType,
          quantity,
          limitPrice: orderType === 'LIMIT' ? limitPrice : undefined,
          idempotencyKey: `ord_${Date.now()}_${Math.random()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      setSuccessMsg(data.message || 'Order placed successfully');
      await refreshPaperAccount();
      await refreshNotifications();
      if (onOrderExecuted) onOrderExecuted();

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 dark:text-white tracking-wide">{symbol}</span>
              <span className="text-xs text-slate-500 font-mono">NSE</span>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-[280px]">{companyName}</p>
          </div>
          <div className="text-right">
            <span className="font-mono font-semibold text-sm text-slate-900 dark:text-white">{formatINR(quote?.price)}</span>
            <span className={`block text-xs font-mono ${(quote?.change || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {(quote?.change || 0) >= 0 ? '+' : ''}{quote?.changePercent || 0}%
            </span>
          </div>
        </div>

        {/* Side Tabs: Buy / Sell */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 m-4 rounded-lg">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2 text-xs font-semibold rounded-md transition-colors ${
              side === 'BUY' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2 text-xs font-semibold rounded-md transition-colors ${
              side === 'SELL' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            SELL
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-4">
          {/* Product Type & Order Type */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Product</label>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
                <button
                  type="button"
                  onClick={() => setProductType('CNC')}
                  className={`flex-1 py-1 rounded text-center font-medium ${
                    productType === 'CNC' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Delivery (CNC)
                </button>
                <button
                  type="button"
                  onClick={() => setProductType('MIS')}
                  className={`flex-1 py-1 rounded text-center font-medium ${
                    productType === 'MIS' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Intraday (MIS)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Order Type</label>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
                <button
                  type="button"
                  onClick={() => setOrderType('MARKET')}
                  className={`flex-1 py-1 rounded text-center font-medium ${
                    orderType === 'MARKET' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Market
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('LIMIT')}
                  className={`flex-1 py-1 rounded text-center font-medium ${
                    orderType === 'LIMIT' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Limit
                </button>
              </div>
            </div>
          </div>

          {/* Quantity & Limit Price Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex gap-1 mt-1 text-[10px]">
                {[10, 25, 50, 100].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Price (₹)</label>
              <input
                type="number"
                step="0.05"
                disabled={orderType === 'MARKET'}
                value={orderType === 'MARKET' ? currentPrice : limitPrice}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || currentPrice)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-mono text-slate-900 dark:text-white disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="block text-[10px] text-slate-400 mt-1">Tick size ₹0.05</span>
            </div>
          </div>

          {/* Order Summary & Charges */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs space-y-1 font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Order Value</span>
              <span>{formatINR(orderValue)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Est. Regulatory & Taxes (0.13%)</span>
              <span>{formatINR(estimatedCharges)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white">
              <span>Total Required</span>
              <span>{formatINR(totalRequired)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>Virtual Cash Available</span>
              <span>{formatINR(paperAccount?.availableCash || 0)}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md text-xs text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-md text-xs text-emerald-600 dark:text-emerald-400">
              {successMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold text-white transition-opacity ${
                side === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              } ${submitting ? 'opacity-50' : ''}`}
            >
              {submitting ? 'Placing Order...' : `${side} ${quantity} ${symbol}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
