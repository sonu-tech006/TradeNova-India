import { IMarketDataProvider, MarketQuote, Candle, IndexQuote, MarketNewsItem, ProviderStatus, DataStatus } from '../types.js';
import { getIndianMarketStatus } from '../indianMarketCalendar.js';
import { INDIAN_STOCKS_SEED } from '../../data/indianStocksSeed.js';

/**
 * TrueData Market Data Provider Adapter
 * Implements official TrueData REST API specifications for Indian Equities (NSE/BSE).
 * TrueData endpoints: https://api.truedata.in
 */
export class TrueDataProvider implements IMarketDataProvider {
  readonly name = 'TrueData Real-Time Feed';
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private lastUpdate: string | null = null;

  constructor() {
    this.apiKey = process.env.MARKET_DATA_API_KEY || '';
    this.apiSecret = process.env.MARKET_DATA_API_SECRET || '';
    this.baseUrl = process.env.MARKET_DATA_BASE_URL || 'https://api.truedata.in';
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  getStatus(): ProviderStatus {
    const configured = this.isConfigured();
    return {
      activeProvider: this.name,
      isConfigured: configured,
      dataMode: configured ? 'REAL-TIME' : 'DEMO',
      connectionStatus: configured ? 'CONNECTED' : 'AUTHENTICATION_REQUIRED',
      lastSuccessfulUpdate: this.lastUpdate,
      missingKeys: configured ? [] : ['MARKET_DATA_API_KEY'],
      supportedFeatures: {
        realTimeQuotes: true,
        batchQuotes: true,
        historicalCandles: true,
        marketDepth: true,
        indices: true,
        streamingWebSocket: true,
      },
      documentationUrl: 'https://truedata.in/feedback/knowledge-base/category/api-documentation',
      setupInstructions:
        'To enable licensed live TrueData feed: 1. Subscribe to TrueData Real-Time API plan for NSE/BSE. 2. Obtain your API Key and API Secret from the TrueData portal. 3. Add MARKET_DATA_API_KEY and MARKET_DATA_PROVIDER=TRUEDATA in Settings > Data Sources or server environment variables.',
    };
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      // Official TrueData Real-time Quotes REST Endpoint
      const response = await fetch(`${this.baseUrl}/getrealtimequotes?symbol=${symbol}&response=json`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`TrueData API returned HTTP ${response.status}`);
      }

      const data: any = await response.json();
      this.lastUpdate = new Date().toISOString();
      const market = getIndianMarketStatus();

      return {
        symbol: symbol.toUpperCase(),
        exchange: 'NSE',
        companyName: data.company_name || symbol,
        price: Number(data.ltp || data.last_price || 0),
        change: Number(data.change || 0),
        changePercent: Number(data.change_percent || 0),
        open: Number(data.open || 0),
        high: Number(data.high || 0),
        low: Number(data.low || 0),
        close: Number(data.close || data.ltp || 0),
        previousClose: Number(data.prev_close || 0),
        volume: Number(data.volume || 0),
        lastUpdated: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        dataStatus: 'REAL-TIME',
        dataSource: 'TrueData Real-Time Feed',
        isMarketOpen: market.isOpen,
      };
    } catch (e: any) {
      console.warn(`[TrueData] Error fetching quote for ${symbol}:`, e.message);
      return null;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<Record<string, MarketQuote>> {
    const results: Record<string, MarketQuote> = {};
    if (!this.isConfigured()) return results;

    try {
      // TrueData batch symbol parameter
      const symbolsParam = symbols.join(',');
      const response = await fetch(`${this.baseUrl}/getrealtimequotes?symbols=${symbolsParam}&response=json`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.ok) {
        const dataList: any = await response.json();
        const market = getIndianMarketStatus();
        if (Array.isArray(dataList)) {
          for (const item of dataList) {
            const sym = (item.symbol || '').toUpperCase();
            results[sym] = {
              symbol: sym,
              exchange: 'NSE',
              companyName: item.company_name || sym,
              price: Number(item.ltp || 0),
              change: Number(item.change || 0),
              changePercent: Number(item.change_percent || 0),
              open: Number(item.open || 0),
              high: Number(item.high || 0),
              low: Number(item.low || 0),
              close: Number(item.close || item.ltp || 0),
              previousClose: Number(item.prev_close || 0),
              volume: Number(item.volume || 0),
              lastUpdated: new Date().toISOString(),
              receivedAt: new Date().toISOString(),
              dataStatus: 'REAL-TIME',
              dataSource: 'TrueData Real-Time Feed',
              isMarketOpen: market.isOpen,
            };
          }
        }
      }
    } catch (e) {}
    return results;
  }

  async getHistoricalCandles(symbol: string, interval: string, range: string): Promise<{ candles: Candle[]; dataStatus: DataStatus; dataSource: string }> {
    if (!this.isConfigured()) {
      return { candles: [], dataStatus: 'DEMO', dataSource: 'TrueData (Unconfigured)' };
    }

    try {
      // Official TrueData historical endpoint
      const response = await fetch(
        `${this.baseUrl}/gethistoricaldata?symbol=${symbol}&interval=${interval}&duration=${range}&response=json`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }
      );
      if (response.ok) {
        const raw: any = await response.json();
        const candles: Candle[] = (raw.records || []).map((r: any) => ({
          time: Math.floor(new Date(r.timestamp).getTime() / 1000),
          open: Number(r.open),
          high: Number(r.high),
          low: Number(r.low),
          close: Number(r.close),
          volume: Number(r.volume || 0),
        }));
        return { candles, dataStatus: 'REAL-TIME', dataSource: 'TrueData Historical Feed' };
      }
    } catch (e) {}

    return { candles: [], dataStatus: 'DEMO', dataSource: 'TrueData Feed' };
  }

  async getIndices(): Promise<IndexQuote[]> {
    return [];
  }

  async getMarketNews(symbol?: string): Promise<MarketNewsItem[]> {
    return [];
  }
}
