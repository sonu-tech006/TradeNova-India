import React, { useState, useEffect } from 'react';
import { InstrumentItem } from '../types.js';
import { formatINR, formatCrores, formatVolume, formatPercent } from '../utils/formatters.js';
import { OrderTicketModal } from '../components/OrderTicketModal.js';
import { PriceAlertModal } from '../components/PriceAlertModal.js';
import { CompanyLogo } from '../components/CompanyLogo.js';
import { useApp } from '../context/AppContext.js';

interface StockExplorerProps {
  onOpenChart: (symbol: string) => void;
  onOpenAI: (symbol: string) => void;
}

export const StockExplorerPage: React.FC<StockExplorerProps> = ({ onOpenChart, onOpenAI }) => {
  const { token, refreshPaperAccount } = useApp();

  const [instruments, setInstruments] = useState<InstrumentItem[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedExchange, setSelectedExchange] = useState('ALL');
  const [selectedCap, setSelectedCap] = useState<'ALL' | 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP'>('ALL');
  
  // P/E Ratio Filter State
  const [pePreset, setPePreset] = useState<'ALL' | 'UNDER_15' | '15_25' | '25_40' | 'OVER_40' | 'CUSTOM'>('ALL');
  const [minPeInput, setMinPeInput] = useState('');
  const [maxPeInput, setMaxPeInput] = useState('');

  // Dividend Yield Threshold State
  const [minDivYield, setMinDivYield] = useState<'ALL' | '0.5' | '1' | '2' | '3' | '5'>('ALL');

  // Movement & Sort State
  const [perfFilter, setPerfFilter] = useState<'ALL' | 'GAINERS' | 'LOSERS' | 'MOMENTUM'>('ALL');
  const [sortKey, setSortKey] = useState<string>('marketCapCr');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [selectedStockForOrder, setSelectedStockForOrder] = useState<InstrumentItem | null>(null);
  const [selectedStockForAlert, setSelectedStockForAlert] = useState<InstrumentItem | null>(null);

  // Watchlists user has
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [savedSymbols, setSavedSymbols] = useState<Set<string>>(new Set());

  // Load Watchlists to show favorite status
  useEffect(() => {
    if (token) {
      fetch('/api/watchlists', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => {
          if (data.watchlists) {
            setWatchlists(data.watchlists);
            const allSymbols = new Set<string>();
            data.watchlists.forEach((w: any) => w.symbols?.forEach((s: string) => allSymbols.add(s)));
            setSavedSymbols(allSymbols);
          }
        })
        .catch(() => {});
    }
  }, [token]);

  // Derive active min/max PE based on preset or custom inputs
  const getEffectivePeBounds = (): { min?: string; max?: string } => {
    if (pePreset === 'UNDER_15') return { max: '15' };
    if (pePreset === '15_25') return { min: '15', max: '25' };
    if (pePreset === '25_40') return { min: '25', max: '40' };
    if (pePreset === 'OVER_40') return { min: '40' };
    if (pePreset === 'CUSTOM') {
      return {
        min: minPeInput.trim() ? minPeInput.trim() : undefined,
        max: maxPeInput.trim() ? maxPeInput.trim() : undefined,
      };
    }
    return {};
  };

  // Fetch Instruments & Quotes with current filters
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy: sortKey,
      sortOrder,
    });

    if (search.trim()) query.set('search', search.trim());
    if (selectedSector !== 'ALL') query.set('sector', selectedSector);
    if (selectedExchange !== 'ALL') query.set('exchange', selectedExchange);
    if (selectedCap !== 'ALL') query.set('capCategory', selectedCap);

    const { min, max } = getEffectivePeBounds();
    if (min !== undefined && min !== '') query.set('minPe', min);
    if (max !== undefined && max !== '') query.set('maxPe', max);

    if (minDivYield !== 'ALL') {
      query.set('minDividendYield', minDivYield);
    }

    fetch(`/api/instruments?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled) {
          let list = data.instruments || [];

          // Performance filter client-side if needed
          if (perfFilter === 'GAINERS') {
            list = list.filter((i: InstrumentItem) => (i.quote?.changePercent || 0) > 0);
          } else if (perfFilter === 'LOSERS') {
            list = list.filter((i: InstrumentItem) => (i.quote?.changePercent || 0) < 0);
          } else if (perfFilter === 'MOMENTUM') {
            list = list.filter((i: InstrumentItem) => (i.quote?.changePercent || 0) >= 1.5);
          }

          setInstruments(list);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
          if (data.sectors && data.sectors.length > 0) setSectors(data.sectors);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    search,
    selectedSector,
    selectedExchange,
    selectedCap,
    pePreset,
    minPeInput,
    maxPeInput,
    minDivYield,
    sortKey,
    sortOrder,
    page,
    limit,
    perfFilter,
  ]);

  // Toggle Stock in default Watchlist
  const handleToggleWatchlist = async (symbol: string) => {
    if (!token || watchlists.length === 0) return;
    const defaultWl = watchlists.find((w) => w.isDefault) || watchlists[0];
    const exists = defaultWl.symbols.includes(symbol);

    const newSymbols = exists
      ? defaultWl.symbols.filter((s: string) => s !== symbol)
      : [...defaultWl.symbols, symbol];

    try {
      const res = await fetch(`/api/watchlists/${defaultWl._id}/symbols`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symbols: newSymbols }),
      });

      if (res.ok) {
        setSavedSymbols((prev) => {
          const next = new Set(prev);
          if (exists) next.delete(symbol);
          else next.add(symbol);
          return next;
        });
      }
    } catch (e) {}
  };

  // Column Header Sort Toggle
  const handleSortColumn = (col: string) => {
    if (sortKey === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearch('');
    setSelectedSector('ALL');
    setSelectedExchange('ALL');
    setSelectedCap('ALL');
    setPePreset('ALL');
    setMinPeInput('');
    setMaxPeInput('');
    setMinDivYield('ALL');
    setPerfFilter('ALL');
    setSortKey('marketCapCr');
    setSortOrder('desc');
    setPage(1);
  };

  const isAnyFilterActive =
    search.trim() !== '' ||
    selectedSector !== 'ALL' ||
    selectedExchange !== 'ALL' ||
    selectedCap !== 'ALL' ||
    pePreset !== 'ALL' ||
    minDivYield !== 'ALL' ||
    perfFilter !== 'ALL' ||
    minPeInput !== '' ||
    maxPeInput !== '';

  return (
    <div className="space-y-6">
      {/* Header and Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Stock Explorer</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                SEBI Aligned
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Screen across 330+ verified Indian equities with market cap, P/E ratio, dividend yield, and 35+ economic sectors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">
              Showing <strong>{instruments.length}</strong> of <strong>{total}</strong> active companies
            </span>
            {isAnyFilterActive && (
              <button
                onClick={handleResetFilters}
                className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-md border border-slate-200 dark:border-slate-700 transition-colors font-medium flex items-center gap-1.5"
                title="Reset all filters to defaults"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Primary Filter Row: Search, Sector, Exchange, Market Cap */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-4">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <input
              type="text"
              placeholder="Search symbol or company (e.g. RELIANCE, TCS, ZOMATO)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Sector Dropdown (35+ Sectors) */}
          <div className="lg:col-span-3">
            <select
              value={selectedSector}
              onChange={(e) => {
                setSelectedSector(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Sectors (35+)</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Exchange Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedExchange}
              onChange={(e) => {
                setSelectedExchange(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Exchanges (NSE/BSE)</option>
              <option value="NSE">NSE Only</option>
              <option value="BSE">BSE Only</option>
            </select>
          </div>

          {/* Market Cap Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedCap}
              onChange={(e: any) => {
                setSelectedCap(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Market Caps</option>
              <option value="LARGE_CAP">Large Cap (&ge; ₹20,000 Cr)</option>
              <option value="MID_CAP">Mid Cap (₹5,000 – ₹20,000 Cr)</option>
              <option value="SMALL_CAP">Small Cap (&lt; ₹5,000 Cr)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: P/E Ratio Range, Dividend Yield, Sort By, Price Movement */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-3">
          {/* P/E Ratio Selector */}
          <div className={`${pePreset === 'CUSTOM' ? 'lg:col-span-4' : 'lg:col-span-3'}`}>
            <div className="flex gap-1.5 items-center">
              <select
                value={pePreset}
                onChange={(e: any) => {
                  setPePreset(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All P/E Ratios</option>
                <option value="UNDER_15">Value (&lt; 15x)</option>
                <option value="15_25">Reasonable (15x – 25x)</option>
                <option value="25_40">Growth (25x – 40x)</option>
                <option value="OVER_40">High Growth (&gt; 40x)</option>
                <option value="CUSTOM">Custom P/E Range...</option>
              </select>

              {pePreset === 'CUSTOM' && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPeInput}
                    onChange={(e) => {
                      setMinPeInput(e.target.value);
                      setPage(1);
                    }}
                    className="w-16 px-2 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPeInput}
                    onChange={(e) => {
                      setMaxPeInput(e.target.value);
                      setPage(1);
                    }}
                    className="w-16 px-2 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Dividend Yield Threshold Filter */}
          <div className={`${pePreset === 'CUSTOM' ? 'lg:col-span-3' : 'lg:col-span-3'}`}>
            <select
              value={minDivYield}
              onChange={(e: any) => {
                setMinDivYield(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Dividend Yields</option>
              <option value="0.5">Yield &gt; 0.5%</option>
              <option value="1">Yield &gt; 1.0%</option>
              <option value="2">Yield &gt; 2.0% (High Yield)</option>
              <option value="3">Yield &gt; 3.0% (Dividend Leaders)</option>
              <option value="5">Yield &gt; 5.0% (Top Payers)</option>
            </select>
          </div>

          {/* Price Movement / Performance */}
          <div className="lg:col-span-3">
            <select
              value={perfFilter}
              onChange={(e: any) => {
                setPerfFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Price Movements</option>
              <option value="GAINERS">Gainers (&gt; 0%)</option>
              <option value="LOSERS">Losers (&lt; 0%)</option>
              <option value="MOMENTUM">Top Momentum (&gt; +1.5%)</option>
            </select>
          </div>

          {/* Sort By Dropdown (includes Market Cap sort option) */}
          <div className={`${pePreset === 'CUSTOM' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <select
              value={`${sortKey}-${sortOrder}`}
              onChange={(e) => {
                const [k, o] = e.target.value.split('-');
                setSortKey(k);
                setSortOrder(o as 'asc' | 'desc');
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="marketCapCr-desc">Market Cap: High to Low</option>
              <option value="marketCapCr-asc">Market Cap: Low to High</option>
              <option value="basePrice-desc">Price: High to Low</option>
              <option value="basePrice-asc">Price: Low to High</option>
              <option value="peRatio-asc">P/E Ratio: Value (Low to High)</option>
              <option value="peRatio-desc">P/E Ratio: Growth (High to Low)</option>
              <option value="dividendYield-desc">Dividend Yield: High to Low</option>
              <option value="symbol-asc">Instrument Symbol: A to Z</option>
            </select>
          </div>
        </div>

        {/* Active Filter Badges */}
        {isAnyFilterActive && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-3 text-xs">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Active Filters:</span>
            {selectedCap !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px]">
                Cap: {selectedCap === 'LARGE_CAP' ? 'Large Cap' : selectedCap === 'MID_CAP' ? 'Mid Cap' : 'Small Cap'}
                <button onClick={() => setSelectedCap('ALL')} className="hover:text-blue-800 dark:hover:text-blue-200 font-bold ml-0.5">×</button>
              </span>
            )}
            {pePreset !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[11px]">
                P/E: {pePreset === 'UNDER_15' ? '< 15x' : pePreset === '15_25' ? '15x – 25x' : pePreset === '25_40' ? '25x – 40x' : pePreset === 'OVER_40' ? '> 40x' : `${minPeInput || '0'} - ${maxPeInput || '∞'}x`}
                <button onClick={() => { setPePreset('ALL'); setMinPeInput(''); setMaxPeInput(''); }} className="hover:text-purple-800 dark:hover:text-purple-200 font-bold ml-0.5">×</button>
              </span>
            )}
            {minDivYield !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px]">
                Div Yield &ge; {minDivYield}%
                <button onClick={() => setMinDivYield('ALL')} className="hover:text-emerald-800 dark:hover:text-emerald-200 font-bold ml-0.5">×</button>
              </span>
            )}
            {selectedSector !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px]">
                Sector: {selectedSector}
                <button onClick={() => setSelectedSector('ALL')} className="font-bold ml-0.5">×</button>
              </span>
            )}
            {selectedExchange !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px]">
                Exchange: {selectedExchange}
                <button onClick={() => setSelectedExchange('ALL')} className="font-bold ml-0.5">×</button>
              </span>
            )}
            {perfFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px]">
                Performance: {perfFilter}
                <button onClick={() => setPerfFilter('ALL')} className="hover:text-amber-800 dark:hover:text-amber-200 font-bold ml-0.5">×</button>
              </span>
            )}
            {search.trim() !== '' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px]">
                Search: &quot;{search.trim()}&quot;
                <button onClick={() => setSearch('')} className="font-bold ml-0.5">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stock Universe Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-medium select-none">
                <th className="py-3 px-3 w-10 text-center">Fav</th>
                <th
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  onClick={() => handleSortColumn('symbol')}
                >
                  <div className="flex items-center gap-1">
                    <span>Instrument & Company</span>
                    {sortKey === 'symbol' && (
                      <span className="text-emerald-500 font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3">Sector</th>
                <th className="py-3 px-3 text-center">Category</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  onClick={() => handleSortColumn('marketCapCr')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Market Cap</span>
                    {sortKey === 'marketCapCr' && (
                      <span className="text-emerald-500 font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  onClick={() => handleSortColumn('peRatio')}
                  title="Price to Earnings Ratio"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>P/E Ratio</span>
                    {sortKey === 'peRatio' && (
                      <span className="text-emerald-500 font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  onClick={() => handleSortColumn('dividendYield')}
                  title="Annualized Dividend Yield"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Div Yield</span>
                    {sortKey === 'dividendYield' && (
                      <span className="text-emerald-500 font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  onClick={() => handleSortColumn('basePrice')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Price (₹)</span>
                    {sortKey === 'basePrice' && (
                      <span className="text-emerald-500 font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Day Change</th>
                <th className="py-3 px-3 text-right">Volume</th>
                <th className="py-3 px-3 text-center">Feed</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Filtering verified Indian equities...</span>
                    </div>
                  </td>
                </tr>
              ) : instruments.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 font-sans">
                    <div className="max-w-md mx-auto space-y-2">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">No instruments match the selected criteria</p>
                      <p className="text-xs text-slate-500">
                        Try loosening the Market Cap, P/E ratio, or Dividend Yield filters, or clear your search query.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-xs transition-colors"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                instruments.map((inst) => {
                  const q = inst.quote;
                  const price = q ? q.price : inst.basePrice;
                  const change = q ? q.change : 0;
                  const changePct = q ? q.changePercent : 0;
                  const isUp = change >= 0;
                  const isFav = savedSymbols.has(inst.symbol);

                  const capLabel =
                    inst.marketCapCategory === 'LARGE_CAP'
                      ? 'Large'
                      : inst.marketCapCategory === 'MID_CAP'
                      ? 'Mid'
                      : 'Small';

                  const capBadgeClass =
                    inst.marketCapCategory === 'LARGE_CAP'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : inst.marketCapCategory === 'MID_CAP'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';

                  return (
                    <tr
                      key={inst.symbol}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Watchlist Favorite Toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleWatchlist(inst.symbol)}
                          className={`hover:scale-125 transition-transform text-sm ${
                            isFav ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700 hover:text-amber-400'
                          }`}
                          title={isFav ? 'Remove from default watchlist' : 'Add to watchlist'}
                        >
                          ★
                        </button>
                      </td>

                      {/* Symbol and Company */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <CompanyLogo symbol={inst.symbol} size="sm" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => onOpenChart(inst.symbol)}
                                className="font-bold text-slate-900 dark:text-white hover:text-emerald-500 transition-colors tracking-wide"
                              >
                                {inst.symbol}
                              </button>
                              <span className="text-[10px] text-slate-400 uppercase font-sans">{inst.exchange}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans truncate block max-w-[190px]">
                              {inst.companyName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Sector */}
                      <td className="py-3 px-3 font-sans text-slate-600 dark:text-slate-400 text-xs">
                        <span className="truncate block max-w-[140px]" title={inst.sector}>
                          {inst.sector}
                        </span>
                      </td>

                      {/* Market Cap Category */}
                      <td className="py-3 px-3 text-center font-sans">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${capBadgeClass}`}>
                          {capLabel}
                        </span>
                      </td>

                      {/* Market Cap */}
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums font-semibold">
                        {formatCrores(inst.marketCapCr)}
                      </td>

                      {/* P/E Ratio */}
                      <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {inst.peRatio ? `${inst.peRatio.toFixed(1)}x` : '—'}
                      </td>

                      {/* Dividend Yield */}
                      <td className="py-3 px-3 text-right tabular-nums">
                        <span
                          className={
                            (inst.dividendYield || 0) >= 2.0
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-slate-600 dark:text-slate-400'
                          }
                        >
                          {(inst.dividendYield ?? 0) > 0 ? `${inst.dividendYield?.toFixed(2)}%` : '0.00%'}
                        </span>
                      </td>

                      {/* Latest Price */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatINR(price)}
                      </td>

                      {/* Day Change */}
                      <td className={`py-3 px-4 text-right tabular-nums ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isUp ? '+' : ''}{change.toFixed(2)} ({formatPercent(changePct)})
                      </td>

                      {/* Volume */}
                      <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                        {formatVolume(q?.volume || 0)}
                      </td>

                      {/* Data Status Provenance */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded ${
                            (q?.dataStatus || 'DEMO') === 'REAL-TIME'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : (q?.dataStatus || 'DEMO') === 'DELAYED'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {q?.dataStatus || 'DEMO'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          <button
                            onClick={() => onOpenChart(inst.symbol)}
                            className="px-2 py-1 text-[11px] font-medium border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                            title="Interactive Chart"
                          >
                            Chart
                          </button>
                          <button
                            onClick={() => onOpenAI(inst.symbol)}
                            className="px-2 py-1 text-[11px] font-medium border border-purple-200 dark:border-purple-900/60 rounded bg-purple-50/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-colors"
                            title="AI Stock Research"
                          >
                            AI
                          </button>
                          <button
                            onClick={() => setSelectedStockForAlert(inst)}
                            className="px-2 py-1 text-[11px] font-medium border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                            title="Set Price Alert"
                          >
                            Alert
                          </button>
                          <button
                            onClick={() => setSelectedStockForOrder(inst)}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded shadow-xs transition-colors"
                            title="Submit Virtual Order"
                          >
                            Trade
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

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total companies)
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 font-sans"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 font-sans"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Ticket Modal */}
      {selectedStockForOrder && (
        <OrderTicketModal
          symbol={selectedStockForOrder.symbol}
          companyName={selectedStockForOrder.companyName}
          quote={selectedStockForOrder.quote}
          isOpen={true}
          onClose={() => setSelectedStockForOrder(null)}
          onOrderExecuted={() => {
            refreshPaperAccount();
          }}
        />
      )}

      {/* Price Alert Modal */}
      {selectedStockForAlert && (
        <PriceAlertModal
          symbol={selectedStockForAlert.symbol}
          currentPrice={selectedStockForAlert.quote?.price || selectedStockForAlert.basePrice}
          isOpen={true}
          onClose={() => setSelectedStockForAlert(null)}
        />
      )}
    </div>
  );
};
