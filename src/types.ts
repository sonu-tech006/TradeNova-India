export type DataStatus = 'REAL-TIME' | 'DELAYED' | 'HISTORICAL' | 'STALE' | 'DEMO';

export interface MarketQuote {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  volume: number;
  yearHigh?: number;
  yearLow?: number;
  lastUpdated: string;
  exchangeTimestamp?: string;
  receivedAt: string;
  dataStatus: DataStatus;
  dataSource: string;
  isMarketOpen: boolean;
}

export interface InstrumentItem {
  _id: string;
  symbol: string;
  exchange: 'NSE' | 'BSE';
  companyName: string;
  sector: string;
  industry: string;
  isin: string;
  basePrice: number;
  marketCapCr: number;
  marketCapCategory?: 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP';
  peRatio?: number;
  dividendYield?: number;
  description: string;
  quote?: MarketQuote;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndexQuote {
  name: string;
  symbol: string;
  exchange: 'NSE' | 'BSE';
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  dataStatus: DataStatus;
  dataSource: string;
  lastUpdated: string;
  isMarketOpen: boolean;
}

export interface PaperAccount {
  _id: string;
  userId: string;
  initialCash: number;
  availableCash: number;
  reservedCash: number;
  currency: string;
  totalInvestedValue: number;
  totalHoldingsValue: number;
  totalUnrealizedPnL: number;
  portfolioTotalValue: number;
  pnlPercentage: number;
}

export interface HoldingItem {
  _id: string;
  symbol: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  dayChange: number;
  productType: 'CNC' | 'MIS';
  dataStatus: DataStatus;
}

export interface OrderItem {
  _id: string;
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP_LOSS';
  productType: 'CNC' | 'MIS';
  quantity: number;
  filledQuantity: number;
  limitPrice?: number;
  executedPrice?: number;
  status: 'PENDING' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  estimatedCharges: number;
  createdAt: string;
}

export interface WatchlistItem {
  _id: string;
  name: string;
  isDefault: boolean;
  symbols: string[];
}

export interface PriceAlertItem {
  _id: string;
  userId?: string;
  symbol: string;
  exchange?: string;
  condition: 'ABOVE' | 'BELOW' | 'PCT_CHANGE_UP' | 'PCT_CHANGE_DOWN';
  threshold: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'PAUSED' | 'EXPIRED';
  lastEvaluatedPrice?: number;
  currentPrice?: number;
  dayChangePercent?: number;
  distancePct?: number;
  triggeredAt?: string;
  note?: string;
  createdAt: string;
}

export interface AIResearchReport {
  symbol: string;
  companyName: string;
  dataTimestamp: string;
  dataSource: string;
  overview: string;
  movementAnalysis: string;
  technicalInterpretation: string;
  scenarios: {
    bull: string;
    base: string;
    bear: string;
  };
  risksAndUncertainties: string[];
  disclaimer: string;
}

export interface QuantitativePrediction {
  symbol: string;
  currentPrice: number;
  horizon: '1_SESSION' | '5_SESSIONS' | '20_SESSIONS';
  forecastPrice: number;
  forecastLow: number;
  forecastHigh: number;
  expectedReturnPct: number;
  modelVersion: string;
  modelType: string;
  dataWindowDays: number;
  validationMetrics: {
    mae: number;
    directionalAccuracyPct: number;
    sampleSize: number;
  };
  limitations: string[];
}

export interface TechnicalIndicators {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema9: number | null;
  ema21: number | null;
  rsi14: number | null;
  macd: {
    macdLine: number | null;
    signalLine: number | null;
    histogram: number | null;
  };
  bollingerBands: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  preferences: {
    theme: 'dark' | 'light' | 'system';
    accentColor: string;
    chartStyle: 'candlestick' | 'line';
  };
}

export interface MarketNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  relatedSymbols: string[];
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface JournalEntry {
  _id: string;
  symbol: string;
  thesis: string;
  entryReason: string;
  exitReason?: string;
  strategyTags: string[];
  lessonsLearned?: string;
  pnl?: number;
  rating?: number;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ProviderDiagnostic {
  activeProvider: string;
  isConfigured: boolean;
  dataMode: DataStatus;
  connectionStatus: string;
  lastSuccessfulUpdate: string | null;
  missingKeys: string[];
  documentationUrl: string;
  setupInstructions: string;
}

export interface DatabaseDiagnostic {
  isConnected: boolean;
  type: 'MONGODB_ATLAS' | 'LOCAL_STORE';
  connectionStringMasked?: string;
  databaseName?: string;
  host?: string;
  readyState?: number;
  lastConnectedAt?: string;
  error?: string;
  envConfigured: boolean;
  stats?: {
    instrumentsCount: number;
    activeAlertsCount: number;
    provider: string;
  };
}

export interface DepositItem {
  _id: string;
  userId: string;
  amount: number;
  paymentMethod: 'CARD' | 'UPI' | 'NET_BANKING';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  paymentReference: string;
  details: {
    cardLast4?: string;
    cardNetwork?: string;
    cardHolder?: string;
    upiId?: string;
    bankName?: string;
  };
  createdAt: string;
}


