import React, { useState, useEffect } from 'react';
import { AIResearchReport, QuantitativePrediction } from '../types.js';
import { formatINR, formatPercent } from '../utils/formatters.js';

interface AIResearchPageProps {
  initialSymbol?: string;
  onSelectStock: (symbol: string) => void;
}

export const AIResearchPage: React.FC<AIResearchPageProps> = ({ initialSymbol = 'RELIANCE', onSelectStock }) => {
  const [symbol, setSymbol] = useState(initialSymbol.toUpperCase());
  const [report, setReport] = useState<AIResearchReport | null>(null);
  const [prediction, setPrediction] = useState<QuantitativePrediction | null>(null);
  const [horizon, setHorizon] = useState<'1_SESSION' | '5_SESSIONS' | '20_SESSIONS'>('5_SESSIONS');
  const [loading, setLoading] = useState(true);
  const [predLoading, setPredLoading] = useState(true);

  // Chat Assistant State
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: `Hello! I am your TradeNova Research Copilot powered by Gemini. Ask me about ${symbol}'s technical indicators, valuation multiples, support/resistance zones, or macro catalysts.`,
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Load AI Research Report
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetch(`/api/ai/research/${symbol}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.report) {
          setReport(data.report);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [symbol]);

  // Load Quantitative Prediction
  useEffect(() => {
    let isCancelled = false;
    setPredLoading(true);

    fetch(`/api/ai/prediction/${symbol}?horizon=${horizon}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.prediction) {
          setPrediction(data.prediction);
          setPredLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) setPredLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [symbol, horizon]);

  // Handle Assistant Chat
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    const q = chatQuestion.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setChatQuestion('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, symbol }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { sender: 'ai', text: data.answer || 'No analysis available.' }]);
    } catch (e: any) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Error contacting research server. Please try again shortly.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const quickSymbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ZOMATO', 'TRENT', 'HAL', 'MARUTI', 'SUZLON'];

  return (
    <div className="space-y-6">
      {/* Header and Quick Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">AI Equity Research & Prediction</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono">
                Gemini 3.8 Flash + Quant Model
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Grounded company synthesis, technical interpretation, scenario modeling, and backtested price forecasting.
            </p>
          </div>

          {/* Quick Select Stock */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono">
            <span className="text-slate-400 font-sans text-xs">Analyze:</span>
            {quickSymbols.map((s) => (
              <button
                key={s}
                onClick={() => setSymbol(s)}
                className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                  symbol === s
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Research Report & Scenarios (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Synthesis Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-900 dark:text-white tracking-wide">{symbol}</span>
                <span className="text-xs text-slate-500">({report?.companyName || symbol})</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Data Provenance: {report?.dataSource || 'TradeNova Market Feed'}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Synthesizing company fundamentals and latest technical indicators...
              </div>
            ) : (
              <div className="pt-4 space-y-4 text-xs">
                {/* Overview */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-1">
                    01. Business Overview & Industry Positioning
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {report?.overview}
                  </p>
                </div>

                {/* Price & Technical Movement */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <div>
                    <h5 className="font-semibold text-slate-800 dark:text-slate-300 text-[11px] mb-1">
                      Price Movement Analysis
                    </h5>
                    <p className="text-slate-600 dark:text-slate-400">
                      {report?.movementAnalysis}
                    </p>
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-800 dark:text-slate-300 text-[11px] mb-1">
                      Technical Indicator Interpretation
                    </h5>
                    <p className="text-slate-600 dark:text-slate-400">
                      {report?.technicalInterpretation}
                    </p>
                  </div>
                </div>

                {/* Bull / Base / Bear Scenario Matrix */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-2">
                    02. Scenario Trajectory (Bull / Base / Bear)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Bull Scenario</span>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        {report?.scenarios.bull}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Base Scenario</span>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        {report?.scenarios.base}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                      <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">Bear Scenario</span>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        {report?.scenarios.bear}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key Risks and Uncertainties */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-1.5">
                    03. Critical Risks & Key Uncertainties
                  </h4>
                  <ul className="space-y-1 list-disc pl-4 text-slate-600 dark:text-slate-400">
                    {report?.risksAndUncertainties.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Disclaimer */}
                <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                  {report?.disclaimer}
                </div>
              </div>
            )}
          </div>

          {/* Quantitative Price Prediction Engine Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Quantitative Price Forecasting Engine</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 font-semibold">
                    {prediction?.modelVersion || 'TN-Quant-v2.4'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chronologically out-of-sample evaluated autoregressive momentum & drift model.
                </p>
              </div>

              {/* Horizon Selectors */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-mono">
                {(['1_SESSION', '5_SESSIONS', '20_SESSIONS'] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      horizon === h
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {h === '1_SESSION' ? '1 Day' : h === '5_SESSIONS' ? '5 Days' : '20 Days'}
                  </button>
                ))}
              </div>
            </div>

            {predLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Running backtested quantitative model and volatility band estimation...
              </div>
            ) : prediction ? (
              <div className="pt-4 space-y-4">
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Current Price</span>
                    <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block">
                      {formatINR(prediction.currentPrice)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Expected Target</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      {formatINR(prediction.forecastPrice)}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-semibold block">
                      {formatPercent(prediction.expectedReturnPct)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">95% Confidence Band</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                      {formatINR(prediction.forecastLow)} – {formatINR(prediction.forecastHigh)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Out-of-Sample Accuracy</span>
                    <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block">
                      {prediction.validationMetrics.directionalAccuracyPct}%
                    </span>
                    <span className="text-[10px] text-slate-400 block font-sans">MAE: ₹{prediction.validationMetrics.mae}</span>
                  </div>
                </div>

                {/* Model Validation & Limitations */}
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-amber-500 text-[11px] block">
                    Experimental Estimate — Not a Financial Guarantee
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Model evaluated on {prediction.validationMetrics.sampleSize} prior trading sessions without lookahead leakage.
                    Limitations: {prediction.limitations[0]}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Conversational AI Copilot Terminal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col h-[650px]">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">TradeNova Terminal Assistant</h3>
              <span className="text-[10px] text-slate-400">Contextual Q&A on {symbol}</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs pr-1">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ml-6 font-medium'
                    : 'bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-slate-700 dark:text-slate-300 mr-6'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {msg.sender === 'user' ? 'You' : 'TradeNova AI'}
                </div>
                {msg.text}
              </div>
            ))}
            {chatLoading && (
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs italic">
                Analyzing indicators and composing response...
              </div>
            )}
          </div>

          {/* Suggested Queries */}
          <div className="py-2 flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <button
              onClick={() => setChatQuestion(`Explain today's movement in ${symbol}.`)}
              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              Explain movement
            </button>
            <button
              onClick={() => setChatQuestion(`What are the key support and resistance levels for ${symbol}?`)}
              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              Support/Resistance
            </button>
            <button
              onClick={() => setChatQuestion(`What are the primary investment risks for ${symbol}?`)}
              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              Risks
            </button>
          </div>

          {/* Question Input */}
          <form onSubmit={handleSendChat} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder={`Ask about ${symbol}...`}
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatQuestion.trim()}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
