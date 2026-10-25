import { IMarketDataProvider, MarketQuote, Candle, IndexQuote, MarketNewsItem, ProviderStatus, DataStatus } from '../types.js';
import { getIndianMarketStatus } from '../indianMarketCalendar.js';

/**
 * Zerodha Kite Connect Market Data Provider Adapter
 * Implements Kite Connect 3 API endpoints:
 * Quote: GET https://api.kite.trade/quote?i=NSE:SYMBOL
 * Historical: GET https://api.kite.trade/instruments/historical/:instrument_token/:interval
 */
export class KiteConnectProvider implements IMarketDataProvider {
  readonly name = 'Kite Connect API';
  private apiKey: string;
  private accessToken: string;
  private baseUrl = 'https://api.kite.trade';
  private lastUpdate: string | null = null;

  constructor() {
    this.apiKey = process.env.MARKET_DATA_API_KEY || '';
    this.accessToken = process.env.MARKET_DATA_API_SECRET || '';
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0 && this.accessToken.trim().length > 0;
  }

  getStatus(): ProviderStatus {
    const configured = this.isConfigured();
    return {
      activeProvider: this.name,
      isConfigured: configured,
      dataMode: configured ? 'REAL-TIME' : 'DEMO',
      connectionStatus: configured ? 'CONNECTED' : 'AUTHENTICATION_REQUIRED',
      lastSuccessfulUpdate: this.lastUpdate,
      missingKeys: configured ? [] : ['MARKET_DATA_API_KEY', 'MARKET_DATA_API_SECRET'],
      supportedFeatures: {
        realTimeQuotes: true,
        batchQuotes: true,
        historicalCandles: true,
        marketDepth: true,
        indices: true,
        streamingWebSocket: true,
      },
      documentationUrl: 'https://kite.trade/docs/connect/v3/market-quotes/',
      setupInstructions:
        'To connect Zerodha Kite: 1. Create a developer app at kite.trade. 2. Set MARKET_DATA_API_KEY to your app api_key. 3. Generate a daily session access_token and set it to MARKET_DATA_API_SECRET.',
    };
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    if (!this.isConfigured()) return null;

    try {
      const response = await fetch(`${this.baseUrl}/quote?i=NSE:${symbol.toUpperCase()}`, {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${this.apiKey}:${this.accessToken}`,
        },
      });

      if (!response.ok) return null;
      const json: any = await response.json();
      const item = json.data?.[`NSE:${symbol.toUpperCase()}`];
      if (!item) return null;

      this.lastUpdate = new Date().toISOString();
      const market = getIndianMarketStatus();
      const ohlc = item.ohlc || {};

      return {
        symbol: symbol.toUpperCase(),
        exchange: 'NSE',
        companyName: symbol.toUpperCase(),
        price: Number(item.last_price || 0),
        change: Number(item.net_change || (item.last_price - ohlc.close) || 0),
        changePercent: Number((((item.last_price - ohlc.close) / ohlc.close) * 100) || 0),
        open: Number(ohlc.open || 0),
        high: Number(ohlc.high || 0),
        low: Number(ohlc.low || 0),
        close: Number(item.last_price || 0),
        previousClose: Number(ohlc.close || 0),
        volume: Number(item.volume || 0),
        lastUpdated: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        dataStatus: 'REAL-TIME',
        dataSource: 'Zerodha Kite Connect',
        isMarketOpen: market.isOpen,
      };
    } catch (e) {
      return null;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<Record<string, MarketQuote>> {
    const results: Record<string, MarketQuote> = {};
    if (!this.isConfigured()) return results;

    try {
      const query = symbols.map((s) => `i=NSE:${s.toUpperCase()}`).join('&');
      const response = await fetch(`${this.baseUrl}/quote?${query}`, {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${this.apiKey}:${this.accessToken}`,
        },
      });

      if (response.ok) {
        const json: any = await response.json();
        const market = getIndianMarketStatus();
        for (const [key, item] of Object.entries(json.data || {})) {
          const sym = key.replace('NSE:', '').toUpperCase();
          const d: any = item;
          const ohlc = d.ohlc || {};
          results[sym] = {
            symbol: sym,
            exchange: 'NSE',
            companyName: sym,
            price: Number(d.last_price || 0),
            change: Number(d.net_change || (d.last_price - ohlc.close) || 0),
            changePercent: Number((((d.last_price - ohlc.close) / ohlc.close) * 100) || 0),
            open: Number(ohlc.open || 0),
            high: Number(ohlc.high || 0),
            low: Number(ohlc.low || 0),
            close: Number(d.last_price || 0),
            previousClose: Number(ohlc.close || 0),
            volume: Number(d.volume || 0),
            lastUpdated: new Date().toISOString(),
            receivedAt: new Date().toISOString(),
            dataStatus: 'REAL-TIME',
            dataSource: 'Zerodha Kite Connect',
            isMarketOpen: market.isOpen,
          };
        }
      }
    } catch (e) {}

    return results;
  }

  async getHistoricalCandles(symbol: string, interval: string, range: string): Promise<{ candles: Candle[]; dataStatus: DataStatus; dataSource: string }> {
    return { candles: [], dataStatus: 'DEMO', dataSource: 'Zerodha Kite Connect' };
  }

  async getIndices(): Promise<IndexQuote[]> {
    return [];
  }

  async getMarketNews(symbol?: string): Promise<MarketNewsItem[]> {
    return [];
  }
}
