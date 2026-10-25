import React from 'react';

const BRAND_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  RELIANCE: { bg: 'from-blue-600 to-indigo-800', text: 'text-white', label: 'RIL' },
  TCS: { bg: 'from-cyan-700 to-blue-900', text: 'text-white', label: 'TCS' },
  HDFCBANK: { bg: 'from-blue-800 to-indigo-900', text: 'text-white', label: 'HDFC' },
  INFY: { bg: 'from-blue-500 to-sky-700', text: 'text-white', label: 'INFY' },
  ICICIBANK: { bg: 'from-orange-600 to-red-700', text: 'text-white', label: 'ICICI' },
  TATAMOTORS: { bg: 'from-sky-700 to-blue-800', text: 'text-white', label: 'TATA' },
  BHARTIARTL: { bg: 'from-red-600 to-rose-700', text: 'text-white', label: 'AIR' },
  SBIN: { bg: 'from-sky-600 to-blue-800', text: 'text-white', label: 'SBI' },
  ZOMATO: { bg: 'from-red-500 to-rose-600', text: 'text-white', label: 'ZOM' },
  TRENT: { bg: 'from-emerald-600 to-teal-800', text: 'text-white', label: 'TRN' },
  HAL: { bg: 'from-amber-600 to-orange-700', text: 'text-white', label: 'HAL' },
  ITC: { bg: 'from-amber-700 to-orange-800', text: 'text-white', label: 'ITC' },
  LT: { bg: 'from-yellow-600 to-amber-700', text: 'text-white', label: 'L&T' },
  BAJFINANCE: { bg: 'from-blue-600 to-sky-700', text: 'text-white', label: 'BAJ' },
  MARUTI: { bg: 'from-red-700 to-slate-900', text: 'text-white', label: 'MSI' },
  SUNPHARMA: { bg: 'from-orange-500 to-amber-600', text: 'text-white', label: 'SUN' },
  TITAN: { bg: 'from-rose-600 to-pink-800', text: 'text-white', label: 'TIT' },
  ADANIENT: { bg: 'from-teal-600 to-emerald-800', text: 'text-white', label: 'ADN' },
  WIPRO: { bg: 'from-indigo-600 to-violet-700', text: 'text-white', label: 'WIP' },
  TATASTEEL: { bg: 'from-blue-800 to-slate-800', text: 'text-white', label: 'TSL' },
  BEL: { bg: 'from-emerald-700 to-teal-900', text: 'text-white', label: 'BEL' },
  JIOFIN: { bg: 'from-blue-600 to-rose-600', text: 'text-white', label: 'JIO' },
  NTPC: { bg: 'from-green-600 to-emerald-800', text: 'text-white', label: 'NTPC' },
  COALINDIA: { bg: 'from-slate-700 to-zinc-900', text: 'text-white', label: 'CIL' },
  ONGC: { bg: 'from-red-700 to-amber-800', text: 'text-white', label: 'ONGC' },
};

export const CompanyLogo: React.FC<{
  symbol: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ symbol, size = 'md', className = '' }) => {
  const sym = (symbol || '').toUpperCase().replace(/\.NS$/, '');
  const brand = BRAND_STYLES[sym] || {
    bg: 'from-slate-700 to-slate-900',
    text: 'text-white',
    label: sym.slice(0, 3) || 'STK',
  };

  const sizeClasses = {
    xs: 'w-5 h-5 text-[8px] rounded-md',
    sm: 'w-7 h-7 text-[10px] rounded-lg',
    md: 'w-9 h-9 text-xs rounded-xl',
    lg: 'w-11 h-11 text-sm rounded-2xl',
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center font-black tracking-tight select-none shadow-xs shrink-0 bg-gradient-to-br ${brand.bg} ${brand.text} ${sizeClasses} ${className}`}
      title={sym}
    >
      <span>{brand.label}</span>
    </div>
  );
};
