import { IMarketDataProvider, MarketQuote, Candle, IndexQuote, MarketNewsItem, ProviderStatus, DataStatus } from '../types.js';
import { getIndianMarketStatus } from '../indianMarketCalendar.js';

/**
 * Yahoo Finance Real-Market Data Provider Adapter
 * Connects to public Yahoo Finance query APIs for Indian NSE/BSE securities (*.NS, *.BO)
 * Provides genuine market quotes and historical candles with explicit DELAYED / HISTORICAL provenance.
 */
export class YahooFinanceProvider implements IMarketDataProvider {
  readonly name = 'Yahoo Finance (NSE/BSE)';
  private lastUpdate: string | null = null;

  getStatus(): ProviderStatus {
    return {
      activeProvider: this.name,
      isConfigured: true,
      dataMode: 'DELAYED',
      connectionStatus: 'CONNECTED',
      lastSuccessfulUpdate: this.lastUpdate,
      missingKeys: [],
      supportedFeatures: {
        realTimeQuotes: false,
        batchQuotes: true,
        historicalCandles: true,
        marketDepth: false,
        indices: true,
        streamingWebSocket: false,
      },
      documentationUrl: 'https://finance.yahoo.com/quote/%5ENSEI/',
      setupInstructions:
        'Live Yahoo Finance provider is active and fetches genuine exchange quotes with a standard 15-minute exchange delay.',
    };
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    try {
      const ticker = `${symbol.toUpperCase()}.NS`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TradeNova-Fintech/1.0' },
      });

      if (!res.ok) return null;
      const json: any = await res.json();
      const meta = json.chart?.result?.[0]?.meta;
      if (!meta) return null;

      const price = meta.regularMarketPrice || meta.chartPreviousClose || 0;
      const prevClose = meta.chartPreviousClose || meta.previousClose || price;
      const change = Number((price - prevClose).toFixed(2));
      const changePercent = Number((((price - prevClose) / prevClose) * 100).toFixed(2));
      const market = getIndianMarketStatus();

      this.lastUpdate = new Date().toISOString();

      return {
        symbol: symbol.toUpperCase(),
        exchange: 'NSE',
        companyName: meta.shortName || symbol.toUpperCase(),
        price,
        change,
        changePercent,
        open: meta.regularMarketDayOpen || price,
        high: meta.regularMarketDayHigh || price,
        low: meta.regularMarketDayLow || price,
        close: price,
        previousClose: prevClose,
        volume: meta.regularMarketVolume || 0,
        lastUpdated: new Date().toISOString(),
        exchangeTimestamp: new Date((meta.regularMarketTime || 0) * 1000).toISOString(),
        receivedAt: new Date().toISOString(),
        dataStatus: 'DELAYED',
        dataSource: 'Yahoo Finance NSE Feed (15-min Delay)',
        isMarketOpen: market.isOpen,
      };
    } catch (e: any) {
      return null;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<Record<string, MarketQuote>> {
    const results: Record<string, MarketQuote> = {};
    // Fetch parallel quotes in chunks of 5 to avoid throttling
    const chunkSize = 5;
    for (let i = 0; i < symbols.length; i += chunkSize) {
      const chunk = symbols.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (s) => {
          const q = await this.getQuote(s);
          if (q) results[s.toUpperCase()] = q;
        })
      );
    }
    return results;
  }

  async getHistoricalCandles(symbol: string, interval: string, range: string): Promise<{ candles: Candle[]; dataStatus: DataStatus; dataSource: string }> {
    try {
      // Map TradeNova range to Yahoo range
      let yRange = '1mo';
      let yInterval = '1d';

      if (range === '1D') {
        yRange = '1d';
        yInterval = '5m';
      } else if (range === '1W') {
        yRange = '5d';
        yInterval = '15m';
      } else if (range === '1M') {
        yRange = '1mo';
        yInterval = '1d';
      } else if (range === '6M') {
        yRange = '6mo';
        yInterval = '1d';
      } else if (range === '1Y') {
        yRange = '1y';
        yInterval = '1d';
      } else if (range === 'ALL') {
        yRange = '5y';
        yInterval = '1wk';
      }

      const ticker = `${symbol.toUpperCase()}.NS`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${yInterval}&range=${yRange}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TradeNova-Fintech/1.0' },
      });

      if (!res.ok) {
        return { candles: [], dataStatus: 'HISTORICAL', dataSource: 'Yahoo Finance' };
      }

      const json: any = await res.json();
      const result = json.chart?.result?.[0];
      if (!result) return { candles: [], dataStatus: 'HISTORICAL', dataSource: 'Yahoo Finance' };

      const timestamps: number[] = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const opens = quote.open || [];
      const highs = quote.high || [];
      const lows = quote.low || [];
      const closes = quote.close || [];
      const volumes = quote.volume || [];

      const candles: Candle[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null && closes[i] !== undefined && !isNaN(closes[i])) {
          candles.push({
            time: timestamps[i],
            open: Number(Number(opens[i] || closes[i]).toFixed(2)),
            high: Number(Number(highs[i] || closes[i]).toFixed(2)),
            low: Number(Number(lows[i] || closes[i]).toFixed(2)),
            close: Number(Number(closes[i]).toFixed(2)),
            volume: Number(volumes[i] || 0),
          });
        }
      }

      return {
        candles,
        dataStatus: 'HISTORICAL',
        dataSource: 'Yahoo Finance Historical NSE Data',
      };
    } catch (e: any) {
      return { candles: [], dataStatus: 'HISTORICAL', dataSource: 'Yahoo Finance' };
    }
  }

  async getIndices(): Promise<IndexQuote[]> {
    const indicesList = [
      { name: 'NIFTY 50', ticker: '^NSEI', symbol: 'NIFTY50', exchange: 'NSE' as const },
      { name: 'NIFTY BANK', ticker: '^NSEBANK', symbol: 'BANKNIFTY', exchange: 'NSE' as const },
      { name: 'SENSEX', ticker: '^BSESN', symbol: 'SENSEX', exchange: 'BSE' as const },
      { name: 'NIFTY IT', ticker: '^CNXIT', symbol: 'NIFTYIT', exchange: 'NSE' as const },
    ];

    const results: IndexQuote[] = [];
    const market = getIndianMarketStatus();

    for (const idx of indicesList) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${idx.ticker}?interval=1d&range=1d`;
        const res = await fetch(url, { headers: { 'User-Agent': 'TradeNova-Fintech/1.0' } });
        if (res.ok) {
          const json: any = await res.json();
          const meta = json.chart?.result?.[0]?.meta;
          if (meta) {
            const price = Number((meta.regularMarketPrice || meta.chartPreviousClose || 0).toFixed(2));
            const prev = Number((meta.chartPreviousClose || price).toFixed(2));
            const change = Number((price - prev).toFixed(2));
            const changePercent = Number((((price - prev) / prev) * 100).toFixed(2));

            results.push({
              name: idx.name,
              symbol: idx.symbol,
              exchange: idx.exchange,
              currentPrice: price,
              change,
              changePercent,
              high: Number((meta.regularMarketDayHigh || price).toFixed(2)),
              low: Number((meta.regularMarketDayLow || price).toFixed(2)),
              dataStatus: 'DELAYED',
              dataSource: 'Yahoo Finance Feed (15-min Delay)',
              lastUpdated: new Date().toISOString(),
              isMarketOpen: market.isOpen,
            });
          }
        }
      } catch (e) {}
    }

    return results;
  }

  async getMarketNews(symbol?: string): Promise<MarketNewsItem[]> {
    return [];
  }
}
