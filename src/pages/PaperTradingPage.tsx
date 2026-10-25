import React, { useState, useEffect } from 'react';
import { OrderItem } from '../types.js';
import { formatINR } from '../utils/formatters.js';
import { useApp } from '../context/AppContext.js';
import { OrderTicketModal } from '../components/OrderTicketModal.js';

interface PaperTradingPageProps {
  onOpenExplorer: () => void;
}

export const PaperTradingPage: React.FC<PaperTradingPageProps> = ({ onOpenExplorer }) => {
  const { paperAccount, token, refreshPaperAccount, setAddFundsModalOpen } = useApp();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'EXECUTED' | 'CANCELLED'>('ALL');
  const [ticketSymbol, setTicketSymbol] = useState<string | null>(null);

  const fetchOrders = () => {
    if (!token) return;
    setLoading(true);
    fetch('/api/paper/orders', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/paper/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchOrders();
        refreshPaperAccount();
      }
    } catch (e) {}
  };

  const handleResetFunds = async () => {
    if (confirm('Reset your virtual paper trading funds back to ₹10,00,000?')) {
      try {
        const res = await fetch('/api/paper/reset', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          fetchOrders();
          refreshPaperAccount();
        }
      } catch (e) {}
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === 'ALL') return true;
    return o.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Capital Summary Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Paper Trading Simulator</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono">
                SIMULATOR
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Risk-free virtual execution engine tested with realistic STT, turnover charges, and order-state validation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddFundsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Funds (Card/UPI)</span>
            </button>
            <button
              onClick={handleResetFunds}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => setTicketSymbol('RELIANCE')}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors"
            >
              New Order
            </button>
          </div>
        </div>

        {/* Account Balances Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 font-mono">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Available Virtual Cash</span>
            <span className="text-lg font-black text-slate-900 dark:text-emerald-400 mt-0.5 block tabular-nums">
              {formatINR(paperAccount?.availableCash || 1000000)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Invested in Holdings</span>
            <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block tabular-nums">
              {formatINR(paperAccount?.totalInvestedValue || 0)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Unrealized P&L</span>
            <span className={`text-lg font-black mt-0.5 block tabular-nums ${(paperAccount?.totalUnrealizedPnL || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {(paperAccount?.totalUnrealizedPnL || 0) >= 0 ? '+' : ''}{formatINR(paperAccount?.totalUnrealizedPnL || 0)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans uppercase tracking-wider">Total Portfolio Worth</span>
            <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block tabular-nums">
              {formatINR(paperAccount?.portfolioTotalValue || 1000000)}
            </span>
          </div>
        </div>
      </div>

      {/* Orders Filter Tabs & Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
            {(['ALL', 'PENDING', 'EXECUTED', 'CANCELLED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  filterStatus === st
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {filteredOrders.length} {filterStatus.toLowerCase()} orders
          </span>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-medium">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Side</th>
                <th className="py-3 px-4">Instrument</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Limit Price</th>
                <th className="py-3 px-4 text-right">Exec Price</th>
                <th className="py-3 px-4 text-right">Charges</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 font-sans">
                    Loading order book records...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    No orders found in order book.
                    <button
                      onClick={onOpenExplorer}
                      className="ml-2 text-emerald-500 font-medium hover:underline inline"
                    >
                      Browse Stock Universe →
                    </button>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(ord.createdAt).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          ord.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {ord.side}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {ord.symbol}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">NSE</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-sans">{ord.orderType} · {ord.productType}</td>
                    <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-bold">{ord.quantity}</td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {ord.limitPrice ? formatINR(ord.limitPrice) : 'MARKET'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-bold">
                      {ord.executedPrice ? formatINR(ord.executedPrice) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatINR(ord.estimatedCharges)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          ord.status === 'EXECUTED'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : ord.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {ord.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelOrder(ord._id)}
                          className="px-2 py-0.5 text-xs text-rose-600 dark:text-rose-400 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      {ticketSymbol && (
        <OrderTicketModal
          symbol={ticketSymbol}
          companyName={ticketSymbol}
          isOpen={true}
          onClose={() => setTicketSymbol(null)}
          onOrderExecuted={() => {
            fetchOrders();
            refreshPaperAccount();
          }}
        />
      )}
    </div>
  );
};
