import { EventEmitter } from 'events';
import { DataRepository } from '../db/store.js';
import { MarketQuote } from '../market-data/types.js';
import { marketDataManager } from '../market-data/MarketDataManager.js';

export interface AlertTriggerEvent {
  alertId: string;
  userId: string;
  symbol: string;
  condition: string;
  threshold: number;
  triggeredPrice: number;
  timestamp: string;
  note?: string;
  message: string;
}

class AlertEngineService extends EventEmitter {
  // In-memory mapping for O(1) symbol lookup: symbol -> array of active alert objects
  private activeAlertsBySymbol: Map<string, any[]> = new Map();
  private isInitialized = false;
  private monitorTimer: NodeJS.Timeout | null = null;
  private isChecking = false;

  constructor() {
    super();
    // Allow multiple user listeners
    this.setMaxListeners(200);
  }

  /**
   * Initializes the in-memory active alerts cache from MongoDB / store
   */
  public async init() {
    if (this.isInitialized) return;

    try {
      const activeList = await DataRepository.getAllActiveAlerts();
      this.activeAlertsBySymbol.clear();

      for (const alert of activeList) {
        this.indexAlert(alert);
      }

      console.log(`[AlertEngine] Initialized with ${activeList.length} active price alerts across ${this.activeAlertsBySymbol.size} symbols.`);
      this.isInitialized = true;

      // Subscribe to all incoming market quotes in real-time
      marketDataManager.onQuote((quote) => {
        this.evaluateQuote(quote).catch(() => {});
      });

      // Start the efficient background check loop (every 6 seconds)
      this.startBackgroundMonitor(6000);
    } catch (e: any) {
      console.error('[AlertEngine] Initialization error:', e.message);
    }
  }

  /**
   * Index an alert in-memory
   */
  private indexAlert(alert: any) {
    const sym = alert.symbol.toUpperCase().trim();
    const existing = this.activeAlertsBySymbol.get(sym) || [];
    // Ensure no duplicates
    const filtered = existing.filter((a) => a._id.toString() !== alert._id.toString());
    filtered.push(alert);
    this.activeAlertsBySymbol.set(sym, filtered);
  }

  /**
   * Register a new active alert
   */
  public registerAlert(alert: any) {
    if (alert.status === 'ACTIVE') {
      this.indexAlert(alert);
      console.log(`[AlertEngine] Registered active alert for ${alert.symbol} (${alert.condition} ₹${alert.threshold})`);
    }
  }

  /**
   * Remove an alert from active indexing (on trigger, delete, or pause)
   */
  public unregisterAlert(alertId: string, symbol: string) {
    const sym = symbol.toUpperCase().trim();
    const existing = this.activeAlertsBySymbol.get(sym);
    if (existing) {
      const remaining = existing.filter((a) => a._id.toString() !== alertId.toString());
      if (remaining.length > 0) {
        this.activeAlertsBySymbol.set(sym, remaining);
      } else {
        this.activeAlertsBySymbol.delete(sym);
      }
    }
  }

  /**
   * Get active symbols count being monitored
   */
  public getMonitoredSymbols(): string[] {
    return Array.from(this.activeAlertsBySymbol.keys());
  }

  /**
   * Evaluates a single quote against active alerts for that symbol in O(1) lookup
   */
  public async evaluateQuote(quote: MarketQuote) {
    if (!quote || !quote.symbol || !quote.price) return;
    const sym = quote.symbol.toUpperCase().trim();
    const alerts = this.activeAlertsBySymbol.get(sym);
    if (!alerts || alerts.length === 0) return;

    const currentPrice = quote.price;
    const changePct = quote.changePercent || 0;
    const triggeredAlerts: any[] = [];

    for (const alert of [...alerts]) {
      let isTriggered = false;

      if (alert.condition === 'ABOVE') {
        if (currentPrice >= alert.threshold) {
          isTriggered = true;
        }
      } else if (alert.condition === 'BELOW') {
        if (currentPrice <= alert.threshold) {
          isTriggered = true;
        }
      } else if (alert.condition === 'PCT_CHANGE_UP') {
        if (changePct >= alert.threshold) {
          isTriggered = true;
        }
      } else if (alert.condition === 'PCT_CHANGE_DOWN') {
        if (changePct <= -Math.abs(alert.threshold)) {
          isTriggered = true;
        }
      }

      if (isTriggered) {
        triggeredAlerts.push(alert);
      }
    }

    // Process all triggered alerts asynchronously
    for (const alert of triggeredAlerts) {
      await this.handleTriggeredAlert(alert, currentPrice);
    }
  }

  /**
   * Evaluates a batch of quotes
   */
  public async evaluateBatch(quotes: Record<string, MarketQuote>) {
    for (const quote of Object.values(quotes)) {
      await this.evaluateQuote(quote);
    }
  }

  /**
   * Executes notification and persistence for a triggered alert
   */
  private async handleTriggeredAlert(alert: any, currentPrice: number) {
    try {
      const alertId = alert._id.toString();
      const symbol = alert.symbol;

      // 1. Unregister immediately to prevent repeated trigger calls
      this.unregisterAlert(alertId, symbol);

      // 2. Persist updated status in MongoDB / local store
      await DataRepository.updateAlertStatus(alertId, 'TRIGGERED', currentPrice);

      // 3. Construct clear descriptive notification
      const conditionText = alert.condition === 'ABOVE' ? 'crossed above' : 'dropped below';
      const title = `🔔 Alert Triggered: ${symbol}`;
      const message = `${symbol} ${conditionText} your target of ₹${alert.threshold.toLocaleString('en-IN')}. Current price: ₹${currentPrice.toLocaleString('en-IN')}.${alert.note ? ` (${alert.note})` : ''}`;

      // 4. Save Notification in MongoDB / store
      await DataRepository.createNotification({
        userId: alert.userId,
        type: 'PRICE_ALERT',
        title,
        message,
        metadata: {
          alertId,
          symbol,
          threshold: alert.threshold,
          condition: alert.condition,
          triggeredPrice: currentPrice,
          triggeredAt: new Date().toISOString(),
        },
      });

      console.log(`[AlertEngine] 🔥 ALERT TRIGGERED for user ${alert.userId}: ${message}`);

      // 5. Emit real-time event for SSE / Web subscribers
      const eventPayload: AlertTriggerEvent = {
        alertId,
        userId: alert.userId,
        symbol,
        condition: alert.condition,
        threshold: alert.threshold,
        triggeredPrice: currentPrice,
        timestamp: new Date().toISOString(),
        note: alert.note,
        message,
      };

      this.emit('alert_triggered', eventPayload);
      this.emit(`user_${alert.userId}`, eventPayload);
    } catch (e: any) {
      console.error('[AlertEngine] Error handling triggered alert:', e.message);
    }
  }

  /**
   * Starts non-blocking background monitor loop for monitored symbols
   */
  private startBackgroundMonitor(intervalMs: number) {
    if (this.monitorTimer) clearInterval(this.monitorTimer);

    this.monitorTimer = setInterval(async () => {
      if (this.isChecking) return;
      const symbols = this.getMonitoredSymbols();
      if (symbols.length === 0) return;

      this.isChecking = true;
      try {
        // Fetch quotes in batch for only symbols that have active alerts
        const quotes = await marketDataManager.getBatchQuotes(symbols);
        await this.evaluateBatch(quotes);
      } catch (e: any) {
        // Silent catch for background loop
      } finally {
        this.isChecking = false;
      }
    }, intervalMs);

    console.log(`[AlertEngine] Background monitor started (interval: ${intervalMs}ms).`);
  }

  /**
   * Stop background loop
   */
  public stop() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }
}

export const alertEngine = new AlertEngineService();
