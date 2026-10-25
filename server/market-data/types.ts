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
  valueCr?: number;
  yearHigh?: number;
  yearLow?: number;
  lastUpdated: string; // ISO string
  exchangeTimestamp?: string;
  receivedAt: string;
  dataStatus: DataStatus;
  dataSource: string;
  isMarketOpen: boolean;
}

export interface Candle {
  time: number; // Unix timestamp in seconds
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

export interface ProviderStatus {
  activeProvider: string;
  isConfigured: boolean;
  dataMode: DataStatus;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'AUTHENTICATION_REQUIRED' | 'RATE_LIMITED' | 'DEMO_STANDBY';
  lastSuccessfulUpdate: string | null;
  rateLimitStatus?: {
    requestsRemaining: number;
    resetTime: string;
  };
  missingKeys: string[];
  supportedFeatures: {
    realTimeQuotes: boolean;
    batchQuotes: boolean;
    historicalCandles: boolean;
    marketDepth: boolean;
    indices: boolean;
    streamingWebSocket: boolean;
  };
  documentationUrl: string;
  setupInstructions: string;
}

export interface IMarketDataProvider {
  readonly name: string;
  getStatus(): ProviderStatus;
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getBatchQuotes(symbols: string[]): Promise<Record<string, MarketQuote>>;
  getHistoricalCandles(symbol: string, interval: string, range: string): Promise<{ candles: Candle[]; dataStatus: DataStatus; dataSource: string }>;
  getIndices(): Promise<IndexQuote[]>;
  getMarketNews(symbol?: string): Promise<MarketNewsItem[]>;
}
