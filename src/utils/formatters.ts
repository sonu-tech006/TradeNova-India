/**
 * Indian Stock Market Numerical & Currency Formatters
 */

export function formatINR(val: number | undefined | null, showSign: boolean = false): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0.00';

  const sign = showSign && val > 0 ? '+' : '';
  // Indian currency notation using en-IN
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

  return `${sign}${formatted}`;
}

export function formatCrores(valCr: number | undefined | null): string {
  if (!valCr || isNaN(valCr)) return '₹0 Cr';
  if (valCr >= 100000) {
    return `₹${(valCr / 100000).toFixed(2)} L Cr`;
  }
  return `₹${valCr.toLocaleString('en-IN')} Cr`;
}

export function formatVolume(vol: number | undefined | null): string {
  if (!vol || isNaN(vol)) return '0';
  if (vol >= 10000000) {
    return `${(vol / 10000000).toFixed(2)} Cr`;
  }
  if (vol >= 100000) {
    return `${(vol / 100000).toFixed(2)} L`;
  }
  if (vol >= 1000) {
    return `${(vol / 1000).toFixed(1)}k`;
  }
  return vol.toLocaleString('en-IN');
}

export function formatPercent(val: number | undefined | null, showSign: boolean = true): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00%';
  const sign = showSign && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

export function formatDateTimeIST(isoString: string | undefined): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
