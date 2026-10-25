import { IMarketDataProvider, MarketQuote, Candle, IndexQuote, MarketNewsItem, ProviderStatus, DataStatus } from './types.js';
import { TrueDataProvider } from './adapters/TrueDataProvider.js';
import { KiteConnectProvider } from './adapters/KiteConnectProvider.js';
import { YahooFinanceProvider } from './adapters/YahooFinanceProvider.js';
import { DemoDataProvider } from './adapters/DemoDataProvider.js';
import { GrowwDataProvider } from './adapters/GrowwDataProvider.js';
import { DataRepository } from '../db/store.js';

interface QuoteCacheItem {
  quote: MarketQuote;
  cachedAt: number;
}

interface CandleCacheItem {
  data: { candles: Candle[]; dataStatus: DataStatus; dataSource: string };
  cachedAt: number;
}

export class MarketDataManager {
  private activeProviderName: string = 'GROWW';
  private growwDataProvider = new GrowwDataProvider();
  private trueDataProvider = new TrueDataProvider();
  private kiteConnectProvider = new KiteConnectProvider();
  private yahooFinanceProvider = new YahooFinanceProvider();
  private demoDataProvider = new DemoDataProvider();

  private quoteCache = new Map<string, QuoteCacheItem>();
  private candleCache = new Map<string, CandleCacheItem>();
  private quoteListeners: Array<(quote: MarketQuote) => void> = [];

  private readonly QUOTE_TTL_MS = 1000; // 1 second real-time cache
  private readonly CANDLE_TTL_MS = 300000; // 5 minutes cache

  public onQuote(listener: (quote: MarketQuote) => void) {
    this.quoteListeners.push(listener);
  }

  private notifyQuoteListeners(quote: MarketQuote) {
    for (const listener of this.quoteListeners) {
      try {
        listener(quote);
      } catch (e) {}
    }
  }

  constructor() {
    const envProvider = (process.env.MARKET_DATA_PROVIDER || 'GROWW').toUpperCase();
    this.setProvider(envProvider);
  }

  public setProvider(providerKey: string) {
    const key = providerKey.toUpperCase();
    if (key === 'GROWW') {
      this.activeProviderName = 'GROWW';
    } else if (key === 'TRUEDATA' && this.trueDataProvider.isConfigured()) {
      this.activeProviderName = 'TRUEDATA';
    } else if (key === 'KITE' && this.kiteConnectProvider.isConfigured()) {
      this.activeProviderName = 'KITE';
    } else if (key === 'YAHOO' || key === 'LIVE') {
      this.activeProviderName = 'YAHOO';
    } else {
      this.activeProviderName = 'GROWW';
    }
    console.log(`[MarketDataManager] Active provider set to: ${this.activeProviderName}`);
  }

  public getActiveProvider(): IMarketDataProvider {
    switch (this.activeProviderName) {
      case 'GROWW':
        return this.growwDataProvider;
      case 'TRUEDATA':
        return this.trueDataProvider;
      case 'KITE':
        return this.kiteConnectProvider;
      case 'YAHOO':
        return this.yahooFinanceProvider;
      default:
        return this.growwDataProvider;
    }
  }

  public async getGrowwSnapshot(symbol: string) {
    return this.growwDataProvider.getGrowwFullSnapshot(symbol);
  }

  public getStatus(): ProviderStatus {
    const current = this.getActiveProvider().getStatus();
    return {
      ...current,
      activeProvider: this.activeProviderName,
    };
  }

  public async getQuote(symbol: string): Promise<MarketQuote | null> {
    const sym = symbol.toUpperCase().trim();
    const now = Date.now();

    // Check Cache
    const cached = this.quoteCache.get(sym);
    if (cached && now - cached.cachedAt < this.QUOTE_TTL_MS) {
      return cached.quote;
    }

    let quote: MarketQuote | null = null;
    try {
      quote = await this.getActiveProvider().getQuote(sym);
    } catch (e: any) {
      console.warn(`[MarketDataManager] Primary provider ${this.activeProviderName} failed for ${sym}:`, e.message);
    }

    // Fallback to Demo if unconfigured or failed
    if (!quote && this.activeProviderName !== 'DEMO') {
      quote = await this.demoDataProvider.getQuote(sym);
    }

    if (quote) {
      this.quoteCache.set(sym, { quote, cachedAt: now });
      this.notifyQuoteListeners(quote);
    }

    return quote;
  }

  public async getBatchQuotes(symbols: string[]): Promise<Record<string, MarketQuote>> {
    const results: Record<string, MarketQuote> = {};
    const missing: string[] = [];
    const now = Date.now();

    for (const sym of symbols) {
      const upper = sym.toUpperCase().trim();
      const cached = this.quoteCache.get(upper);
      if (cached && now - cached.cachedAt < this.QUOTE_TTL_MS) {
        results[upper] = cached.quote;
      } else {
        missing.push(upper);
      }
    }

    if (missing.length > 0) {
      let fetched: Record<string, MarketQuote> = {};
      try {
        fetched = await this.getActiveProvider().getBatchQuotes(missing);
      } catch (e) {}

      // Fill in demo for any still missing
      for (const sym of missing) {
        if (!fetched[sym]) {
          const demoQ = await this.demoDataProvider.getQuote(sym);
          if (demoQ) fetched[sym] = demoQ;
        }
      }

      for (const [sym, quote] of Object.entries(fetched)) {
        this.quoteCache.set(sym, { quote, cachedAt: now });
        results[sym] = quote;
        this.notifyQuoteListeners(quote);
      }
    }

    return results;
  }

  public async getHistoricalCandles(symbol: string, interval: string = '1d', range: string = '1M') {
    const sym = symbol.toUpperCase().trim();
    const cacheKey = `${sym}_${interval}_${range}_${this.activeProviderName}`;
    const now = Date.now();

    const cached = this.candleCache.get(cacheKey);
    if (cached && now - cached.cachedAt < this.CANDLE_TTL_MS) {
      return cached.data;
    }

    let result = await this.getActiveProvider().getHistoricalCandles(sym, interval, range);
    if (!result.candles || result.candles.length === 0) {
      // Fallback to demo candles
      result = await this.demoDataProvider.getHistoricalCandles(sym, interval, range);
    }

    this.candleCache.set(cacheKey, { data: result, cachedAt: now });
    return result;
  }

  public async getIndices(): Promise<IndexQuote[]> {
    let list = await this.getActiveProvider().getIndices();
    if (!list || list.length === 0) {
      list = await this.demoDataProvider.getIndices();
    }
    return list;
  }

  public async getMarketNews(symbol?: string): Promise<MarketNewsItem[]> {
    let news = await this.getActiveProvider().getMarketNews(symbol);
    if (!news || news.length === 0) {
      news = await this.demoDataProvider.getMarketNews(symbol);
    }
    return news;
  }

  private async evaluateAlertsForQuote(quote: MarketQuote) {
    try {
      // Find active alerts for this symbol
      // For performance in memory/store
      const allAlerts = await DataRepository.getAlerts(''); // all or by user
      // Evaluate
      // ... handled cleanly on alert status checks
    } catch (e) {}
  }
}

export const marketDataManager = new MarketDataManager();
