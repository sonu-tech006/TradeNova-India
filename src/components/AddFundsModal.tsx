import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { formatINR } from '../utils/formatters.js';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFundsModal: React.FC<AddFundsModalProps> = ({ isOpen, onClose }) => {
  const { user, paperAccount, depositFunds, deposits, refreshDeposits } = useApp();

  const [amount, setAmount] = useState<string>('25000');
  const [method, setMethod] = useState<'CARD' | 'UPI' | 'NET_BANKING'>('CARD');

  // Card Form
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(user?.name || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // UPI Form
  const [upiId, setUpiId] = useState('');
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('gpay');

  // Net Banking Form
  const [selectedBank, setSelectedBank] = useState<string>('HDFC Bank');

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState<{ amount: number; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  if (!isOpen) return null;

  const presetAmounts = [5000, 10000, 25000, 50000, 100000];

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    val = val.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(val);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
    }
    setCardExpiry(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessData(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount < 100) {
      setErrorMsg('Minimum deposit amount is ₹100.');
      return;
    }

    if (method === 'CARD') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 16) {
        setErrorMsg('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        setErrorMsg('Please enter a valid expiry date (MM/YY).');
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        setErrorMsg('Please enter a 3-digit CVV.');
        return;
      }
    } else if (method === 'UPI') {
      if (!upiId || !upiId.includes('@')) {
        setErrorMsg('Please enter a valid UPI ID (e.g. mobile@paytm or username@okhdfcbank).');
        return;
      }
    }

    setProcessing(true);

    // Simulate realistic 3D-Secure / Payment Gateway roundtrip
    setTimeout(async () => {
      const details: any = {};
      if (method === 'CARD') {
        const cleanCard = cardNumber.replace(/\s/g, '');
        details.cardLast4 = cleanCard.slice(-4);
        details.cardNetwork = cleanCard.startsWith('4') ? 'Visa' : cleanCard.startsWith('5') ? 'Mastercard' : 'RuPay';
        details.cardHolder = cardHolder || user?.name || 'Trader';
      } else if (method === 'UPI') {
        details.upiId = upiId;
        details.bankName = selectedUpiApp.toUpperCase();
      } else {
        details.bankName = selectedBank;
      }

      const res = await depositFunds(numAmount, method, details);
      setProcessing(false);

      if (res.success) {
        setSuccessData({
          amount: numAmount,
          message: res.message || `₹${numAmount.toLocaleString('en-IN')} added to your trading wallet!`,
        });
      } else {
        setErrorMsg(res.error || 'Payment failed. Please verify payment details.');
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-sm">
              ₹
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Add Funds to Trading Account
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct Deposit via Card, UPI & Net Banking (Instant Credit)
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
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Current Available Balance Bar */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                Current Trading Balance
              </span>
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatINR(paperAccount?.availableCash || 0)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowHistory(!showHistory);
                refreshDeposits();
              }}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showHistory ? 'Hide History' : 'Deposit Ledger'}
            </button>
          </div>

          {/* Deposit Ledger View */}
          {showHistory ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Recent Deposits (MongoDB Atlas)
              </h4>
              {deposits.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No deposits recorded yet. Add funds below using Card or UPI.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {deposits.map((d) => (
                    <div key={d._id} className="p-3 text-xs flex items-center justify-between bg-white dark:bg-slate-900">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>₹{d.amount.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                            {d.paymentMethod}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Ref: {d.paymentReference}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(d.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Success Notification */}
          {successData ? (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Payment Completed!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {successData.message}
              </p>
              <div className="pt-2">
                <span className="text-xs text-slate-500 block">New Trading Balance</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatINR(paperAccount?.availableCash || 0)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSuccessData(null);
                  onClose();
                }}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors mt-2"
              >
                Done & Start Trading
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Amount Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Deposit Amount (INR)
                </label>
                <div className="grid grid-cols-5 gap-2 mb-2.5">
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold font-mono transition-all border ${
                        amount === String(preset)
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      ₹{(preset / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter custom deposit amount"
                    min="100"
                    step="500"
                    required
                    className="w-full pl-8 pr-4 py-2 text-sm font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Payment Method Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('CARD')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                      method === 'CARD'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Debit / Credit Card
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('UPI')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                      method === 'UPI'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    UPI / QR
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('NET_BANKING')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                      method === 'NET_BANKING'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Net Banking
                  </button>
                </div>
              </div>

              {/* CARD DETAILS FORM */}
              {method === 'CARD' && (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1">
                    <span>Card Information</span>
                    <div className="flex items-center gap-2 font-bold font-mono">
                      <span className="text-blue-600">VISA</span>
                      <span className="text-orange-500">Mastercard</span>
                      <span className="text-emerald-600">RuPay</span>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4532 •••• •••• 8821"
                      maxLength={19}
                      required
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white tracking-wider"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Cardholder Name"
                        required
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        maxLength={5}
                        required
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                      />
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="CVV"
                        maxLength={3}
                        required
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* UPI DETAILS FORM */}
              {method === 'UPI' && (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {['gpay', 'phonepe', 'paytm', 'bhim'].map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setSelectedUpiApp(app)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold uppercase transition-colors border ${
                          selectedUpiApp === app
                            ? 'bg-white dark:bg-slate-900 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Enter UPI ID / VPA
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. mobile@okhdfcbank or user@paytm"
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-lg flex items-center gap-3">
                    <div className="w-12 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1 flex items-center justify-center shrink-0">
                      {/* Simulated QR Code matrix */}
                      <div className="grid grid-cols-4 gap-0.5 w-full h-full p-0.5">
                        <div className="bg-slate-900 dark:bg-slate-200" />
                        <div className="bg-slate-900 dark:bg-slate-200" />
                        <div className="bg-transparent" />
                        <div className="bg-slate-900 dark:bg-slate-200" />
                        <div className="bg-slate-900 dark:bg-slate-200" />
                        <div className="bg-transparent" />
                        <div className="bg-slate-900 dark:bg-slate-200" />
                        <div className="bg-slate-900 dark:bg-slate-200" />
                        <div className="bg-transparent" />
                        <div className="bg-slate-900 dark:bg-slate-200" />
                        <div className="bg-slate-900 dark:bg-slate-200" />
                        <div className="bg-transparent" />
                        <div className="bg-slate-900 dark:bg-slate-200" />
                        <div className="bg-slate-900 dark:bg-slate-200" />
                        <div className="bg-transparent" />
                        <div className="bg-slate-900 dark:bg-slate-200" />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="font-semibold block text-slate-900 dark:text-white">Scan & Pay via UPI</span>
                      Scan with any UPI App (GPay, PhonePe, Paytm, Cred)
                    </div>
                  </div>
                </div>
              )}

              {/* NET BANKING FORM */}
              {method === 'NET_BANKING' && (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Select Your Bank
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBank(b)}
                        className={`p-2 rounded-lg text-xs font-semibold text-left transition-colors border ${
                          selectedBank === b
                            ? 'bg-white dark:bg-slate-900 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pay Action Button */}
              <button
                type="submit"
                disabled={processing}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing {method} Payment...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Pay ₹{parseFloat(amount || '0').toLocaleString('en-IN')} & Add to Wallet
                    </span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400 pt-1">
                256-bit encrypted simulated gateway. Updates your balance in MongoDB Atlas in real-time.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
