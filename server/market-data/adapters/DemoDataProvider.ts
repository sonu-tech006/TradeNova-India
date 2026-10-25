import { IMarketDataProvider, MarketQuote, Candle, IndexQuote, MarketNewsItem, ProviderStatus } from '../types.js';
import { getIndianMarketStatus } from '../indianMarketCalendar.js';
import { INDIAN_STOCKS_SEED } from '../../data/indianStocksSeed.js';

/**
 * TradeNova Controlled Demo Market Engine
 * Strictly labeled as 'DEMO' data mode.
 * Simulates NSE/BSE market ticks from real official baseline closing prices of 260+ Indian stocks.
 */
export class DemoDataProvider implements IMarketDataProvider {
  readonly name = 'TradeNova Simulated Demo Engine';
  private stockMap = new Map<string, typeof INDIAN_STOCKS_SEED[0]>();
  private priceOffsets = new Map<string, { currentPrice: number; change: number; changePercent: number; high: number; low: number; volume: number }>();
  private lastUpdate: string = new Date().toISOString();

  constructor() {
    INDIAN_STOCKS_SEED.forEach((s) => {
      this.stockMap.set(s.symbol.toUpperCase(), s);
      // Initialize reproducible small baseline deviation (-2% to +2.5%)
      const hash = s.symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const deltaPct = ((hash % 45) - 20) / 10; // e.g. -2.0% to +2.4%
      const price = Number((s.basePrice * (1 + deltaPct / 100)).toFixed(2));
      const change = Number((price - s.basePrice).toFixed(2));
      const high = Number((Math.max(price, s.basePrice) * 1.012).toFixed(2));
      const low = Number((Math.min(price, s.basePrice) * 0.988).toFixed(2));
      const volume = (hash * 13579) % 2500000 + 150000;

      this.priceOffsets.set(s.symbol.toUpperCase(), {
        currentPrice: price,
        change,
        changePercent: deltaPct,
        high,
        low,
        volume,
      });
    });
  }

  getStatus(): ProviderStatus {
    return {
      activeProvider: this.name,
      isConfigured: true,
      dataMode: 'DEMO',
      connectionStatus: 'DEMO_STANDBY',
      lastSuccessfulUpdate: this.lastUpdate,
      missingKeys: ['MARKET_DATA_API_KEY (TrueData / Kite optional)'],
      supportedFeatures: {
        realTimeQuotes: true,
        batchQuotes: true,
        historicalCandles: true,
        marketDepth: true,
        indices: true,
        streamingWebSocket: false,
      },
      documentationUrl: 'https://www.nseindia.com',
      setupInstructions:
        'Demo mode is active for safe paper trading across all 260+ Indian stocks. To connect live real-time TrueData or Zerodha Kite market data, visit Settings > Data Sources.',
    };
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const sym = symbol.toUpperCase();
    const stock = this.stockMap.get(sym);
    if (!stock) return null;

    const offset = this.priceOffsets.get(sym)!;
    const market = getIndianMarketStatus();
    this.lastUpdate = new Date().toISOString();

    return {
      symbol: stock.symbol,
      exchange: stock.exchange,
      companyName: stock.companyName,
      price: offset.currentPrice,
      change: offset.change,
      changePercent: Number(offset.changePercent.toFixed(2)),
      open: stock.basePrice,
      high: offset.high,
      low: offset.low,
      close: offset.currentPrice,
      previousClose: stock.basePrice,
      volume: offset.volume,
      yearHigh: Number((stock.basePrice * 1.35).toFixed(2)),
      yearLow: Number((stock.basePrice * 0.72).toFixed(2)),
      lastUpdated: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      dataStatus: 'DEMO',
      dataSource: 'TradeNova Simulated Demo Engine (NSE Master Baseline)',
      isMarketOpen: market.isOpen,
    };
  }

  async getBatchQuotes(symbols: string[]): Promise<Record<string, MarketQuote>> {
    const results: Record<string, MarketQuote> = {};
    for (const sym of symbols) {
      const q = await this.getQuote(sym);
      if (q) results[sym.toUpperCase()] = q;
    }
    return results;
  }

  async getHistoricalCandles(symbol: string, interval: string, range: string): Promise<{ candles: Candle[]; dataStatus: 'DEMO'; dataSource: string }> {
    const sym = symbol.toUpperCase();
    const stock = this.stockMap.get(sym) || {
      symbol: sym,
      basePrice: 500,
    };

    const basePrice = stock.basePrice;
    const candles: Candle[] = [];

    // Determine number of bars & timeframe resolution
    let barCount = 60;
    let secondsStep = 86400; // 1 day

    if (range === '1D') {
      barCount = 75; // 5-minute bars for 6.25 hr trading session
      secondsStep = 300;
    } else if (range === '1W') {
      barCount = 50; // 15-minute bars
      secondsStep = 900;
    } else if (range === '1M') {
      barCount = 30; // 1-day bars
      secondsStep = 86400;
    } else if (range === '6M') {
      barCount = 120; // 1-day bars
      secondsStep = 86400;
    } else if (range === '1Y') {
      barCount = 250; // 1-day bars
      secondsStep = 86400;
    } else if (range === 'ALL') {
      barCount = 300; // weekly bars
      secondsStep = 86400 * 7;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    let runningPrice = basePrice * 0.85;

    // Use deterministic seed based on symbol letters
    const hash = sym.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    for (let i = barCount; i >= 0; i--) {
      const barTime = nowSeconds - i * secondsStep;
      // Skip weekends if daily
      const date = new Date(barTime * 1000);
      const day = date.getDay();
      if (secondsStep === 86400 && (day === 0 || day === 6)) {
        continue;
      }

      const cycle = Math.sin((i + hash) * 0.15);
      const noise = (((i * 9301 + 49297) % 233280) / 233280 - 0.49) * 0.025;
      const trend = (barCount - i) / barCount * 0.15; // upward drift

      const open = runningPrice;
      const changePct = cycle * 0.015 + noise + trend * 0.005;
      const close = Number((open * (1 + changePct)).toFixed(2));
      const high = Number((Math.max(open, close) * (1 + Math.abs(noise * 0.8))).toFixed(2));
      const low = Number((Math.min(open, close) * (1 - Math.abs(noise * 0.8))).toFixed(2));
      const volume = Math.floor(50000 + Math.abs(noise) * 5000000);

      runningPrice = close;

      candles.push({
        time: barTime,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    return {
      candles,
      dataStatus: 'DEMO',
      dataSource: 'TradeNova High-Fidelity Demo Simulation Engine',
    };
  }

  async getIndices(): Promise<IndexQuote[]> {
    const market = getIndianMarketStatus();
    return [
      {
        name: 'NIFTY 50',
        symbol: 'NIFTY50',
        exchange: 'NSE',
        currentPrice: 24855.20,
        change: 142.50,
        changePercent: 0.58,
        high: 24910.40,
        low: 24760.10,
        dataStatus: 'DEMO',
        dataSource: 'TradeNova Simulated Index Feed',
        lastUpdated: new Date().toISOString(),
        isMarketOpen: market.isOpen,
      },
      {
        name: 'NIFTY BANK',
        symbol: 'BANKNIFTY',
        exchange: 'NSE',
        currentPrice: 51920.80,
        change: 310.40,
        changePercent: 0.60,
        high: 52100.00,
        low: 51680.50,
        dataStatus: 'DEMO',
        dataSource: 'TradeNova Simulated Index Feed',
        lastUpdated: new Date().toISOString(),
        isMarketOpen: market.isOpen,
      },
      {
        name: 'SENSEX',
        symbol: 'SENSEX',
        exchange: 'BSE',
        currentPrice: 81225.40,
        change: 450.10,
        changePercent: 0.56,
        high: 81400.00,
        low: 80950.00,
        dataStatus: 'DEMO',
        dataSource: 'TradeNova Simulated Index Feed',
        lastUpdated: new Date().toISOString(),
        isMarketOpen: market.isOpen,
      },
      {
        name: 'NIFTY IT',
        symbol: 'NIFTYIT',
        exchange: 'NSE',
        currentPrice: 42180.50,
        change: -125.60,
        changePercent: -0.30,
        high: 42450.00,
        low: 41980.00,
        dataStatus: 'DEMO',
        dataSource: 'TradeNova Simulated Index Feed',
        lastUpdated: new Date().toISOString(),
        isMarketOpen: market.isOpen,
      },
      {
        name: 'NIFTY AUTO',
        symbol: 'NIFTYAUTO',
        exchange: 'NSE',
        currentPrice: 25890.10,
        change: 220.80,
        changePercent: 0.86,
        high: 26010.00,
        low: 25700.00,
        dataStatus: 'DEMO',
        dataSource: 'TradeNova Simulated Index Feed',
        lastUpdated: new Date().toISOString(),
        isMarketOpen: market.isOpen,
      },
    ];
  }

  async getMarketNews(symbol?: string): Promise<MarketNewsItem[]> {
    const allNews: MarketNewsItem[] = [
      {
        id: 'news_1',
        title: 'RBI Monetary Policy Committee maintains benchmark repo rate at 6.5%',
        summary: 'Reserve Bank of India Governor highlights durable growth momentum and resilient domestic capital expenditure while maintaining stance on headline inflation.',
        source: 'Mint Markets',
        url: 'https://livemint.com',
        publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        relatedSymbols: ['HDFCBANK', 'ICICIBANK', 'SBIN'],
        sentiment: 'NEUTRAL',
      },
      {
        id: 'news_2',
        title: 'India Manufacturing PMI surges to multi-month high on robust order book inflows',
        summary: 'Capital goods, automotive, and electronics manufacturing firms report record new export orders and domestic infrastructure capacity expansion.',
        source: 'Business Standard',
        url: 'https://business-standard.com',
        publishedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        relatedSymbols: ['LT', 'MARUTI', 'DIXON', 'HAL'],
        sentiment: 'BULLISH',
      },
      {
        id: 'news_3',
        title: 'Renewable Energy capacity additions cross milestone driven by mega solar parks in Gujarat and Rajasthan',
        summary: 'Adani Green, Tata Power, and Suzlon witness heightened project commissions and grid interconnection approvals under the national clean transition roadmap.',
        source: 'Economic Times',
        url: 'https://economictimes.indiatimes.com',
        publishedAt: new Date(Date.now() - 3600000 * 7).toISOString(),
        relatedSymbols: ['ADANIGREEN', 'TATAPOWER', 'SUZLON'],
        sentiment: 'BULLISH',
      },
      {
        id: 'news_4',
        title: 'Indian IT majors accelerate enterprise GenAI deployment contracts in North America and Europe',
        summary: 'TCS, Infosys, and HCLTech report expanding deal sizes in cloud modernization, cyber resilience, and generative AI copilot implementations.',
        source: 'Financial Express',
        url: 'https://financialexpress.com',
        publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        relatedSymbols: ['TCS', 'INFY', 'HCLTECH', 'WIPRO'],
        sentiment: 'BULLISH',
      },
    ];

    if (symbol) {
      const symUpper = symbol.toUpperCase();
      const filtered = allNews.filter((n) => n.relatedSymbols.includes(symUpper));
      if (filtered.length > 0) return filtered;
    }
    return allNews;
  }
}
