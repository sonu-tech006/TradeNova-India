import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { DataRepository } from '../db/store.js';
import { connectToDatabase, getDatabaseState, saveMongoUriToEnv } from '../db/connection.js';
import { marketDataManager } from '../market-data/MarketDataManager.js';
import { getIndianMarketStatus } from '../market-data/indianMarketCalendar.js';
import { computeTechnicalIndicators, runQuantitativePrediction } from '../ai/quantEngine.js';
import { generateStockResearch, askStockAssistant } from '../ai/geminiAssistant.js';
import { alertEngine } from '../services/AlertEngine.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tradenova_jwt_secret_token_dev_2026';

// Middleware to extract authenticated user
export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

// Optional Auth (for demo / public exploring)
export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
    } catch (e) {}
  }
  next();
}

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

router.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await DataRepository.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await DataRepository.createUser({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      phone,
      role: 'user',
      preferences: {
        theme: 'dark',
        accentColor: '#10B981',
        chartStyle: 'candlestick',
      },
    });

    // Initialize virtual paper trading account (SEBI compliant ₹10,00,000 capital)
    await DataRepository.initPaperAccount(user._id.toString());

    // Send Welcome Notification
    await DataRepository.createNotification({
      userId: user._id.toString(),
      type: 'WELCOME',
      title: 'Welcome to TradeNova Terminal!',
      message: `Namaste ${user.name}! Your account is active with ₹10,00,000 virtual paper trading capital. Explore 260+ Indian equities and configure real-time price alerts.`,
    });

    const token = jwt.sign({ userId: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        preferences: user.preferences,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to create account' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await DataRepository.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        preferences: user.preferences,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Login failed' });
  }
});

router.get('/auth/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await DataRepository.findUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        preferences: user.preferences,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/user/preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await DataRepository.updateUserPreferences(req.userId!, req.body);
    return res.json({ preferences: updated?.preferences });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// STOCK EXPLORER & INSTRUMENT UNIVERSE
// ----------------------------------------------------

router.get('/instruments', async (req: Request, res: Response) => {
  try {
    const {
      search,
      sector,
      exchange,
      page,
      limit,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
      capCategory,
      minPe,
      maxPe,
      minDividendYield,
    } = req.query;

    const data = await DataRepository.getInstruments({
      search: search as string,
      sector: sector as string,
      exchange: exchange as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 25,
      sortBy: (sortBy as string) || 'marketCapCr',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      minPrice: minPrice !== undefined && minPrice !== '' ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice !== undefined && maxPrice !== '' ? parseFloat(maxPrice as string) : undefined,
      capCategory: capCategory as string,
      minPe: minPe !== undefined && minPe !== '' ? parseFloat(minPe as string) : undefined,
      maxPe: maxPe !== undefined && maxPe !== '' ? parseFloat(maxPe as string) : undefined,
      minDividendYield: minDividendYield !== undefined && minDividendYield !== '' ? parseFloat(minDividendYield as string) : undefined,
    });

    // Attach latest cached/live quotes to the page instruments
    const symbols = data.instruments.map((i: any) => i.symbol);
    const quotes = await marketDataManager.getBatchQuotes(symbols);

    const enriched = data.instruments.map((item: any) => {
      const q = quotes[item.symbol];
      return {
        ...item,
        quote: q || {
          price: item.basePrice,
          change: 0,
          changePercent: 0,
          volume: 0,
          dataStatus: 'DEMO',
        },
      };
    });

    return res.json({
      ...data,
      instruments: enriched,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/instruments/:symbol', async (req: Request, res: Response) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const inst = await DataRepository.getInstrumentBySymbol(sym);
    if (!inst) {
      return res.status(404).json({ error: `Instrument ${sym} not found in Indian securities master` });
    }

    const quote = await marketDataManager.getQuote(sym);
    return res.json({
      instrument: inst,
      quote,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/instruments/:symbol/quote', async (req: Request, res: Response) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const quote = await marketDataManager.getQuote(sym);
    if (!quote) {
      return res.status(404).json({ error: 'Quote unavailable for ' + sym });
    }
    return res.json(quote);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/instruments/batch-quotes', async (req: Request, res: Response) => {
  try {
    const { symbols } = req.body;
    if (!Array.isArray(symbols)) {
      return res.status(400).json({ error: 'symbols array is required' });
    }
    const quotes = await marketDataManager.getBatchQuotes(symbols);
    return res.json({ quotes });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/instruments/:symbol/candles', async (req: Request, res: Response) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const interval = (req.query.interval as string) || '1d';
    const range = (req.query.range as string) || '1M';

    const result = await marketDataManager.getHistoricalCandles(sym, interval, range);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/instruments/:symbol/technicals', async (req: Request, res: Response) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const candleData = await marketDataManager.getHistoricalCandles(sym, '1d', '6M');
    const technicals = computeTechnicalIndicators(candleData.candles);
    return res.json({ technicals, dataStatus: candleData.dataStatus });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// MARKET OVERVIEW, INDICES & DATA PROVIDER STATUS
// ----------------------------------------------------

router.get('/market/indices', async (req: Request, res: Response) => {
  try {
    const indices = await marketDataManager.getIndices();
    return res.json({ indices });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/market/status', (req: Request, res: Response) => {
  const status = getIndianMarketStatus();
  return res.json(status);
});

router.get('/market/news', async (req: Request, res: Response) => {
  const symbol = req.query.symbol as string;
  const news = await marketDataManager.getMarketNews(symbol);
  return res.json({ news });
});

router.get('/market/data-status', (req: Request, res: Response) => {
  const status = marketDataManager.getStatus();
  return res.json(status);
});

router.post('/market/provider', (req: Request, res: Response) => {
  const { provider } = req.body;
  if (!provider) {
    return res.status(400).json({ error: 'provider is required' });
  }
  marketDataManager.setProvider(provider);
  return res.json({
    status: marketDataManager.getStatus(),
    message: `Provider updated to ${provider}`,
  });
});

// Groww Live Snapshot (Quotes, 5-level Market Depth Ladder & Greeks)
router.get('/market/groww/snapshot/:symbol', async (req: Request, res: Response) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const snapshot = await marketDataManager.getGrowwSnapshot(sym);
    return res.json({ symbol: sym, ...snapshot });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// 1-Second Real-Time Live Ticker SSE Stream (Delivering 1000ms live ticks)
router.get('/market/live-stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  const symbols = [
    'RELIANCE',
    'TCS',
    'HDFCBANK',
    'INFY',
    'ICICIBANK',
    'TATAMOTORS',
    'BHARTIARTL',
    'SBIN',
    'ITC',
    'LT',
    'BAJFINANCE',
    'MARUTI',
    'ZOMATO',
    'TRENT',
    'HAL',
  ];

  const interval = setInterval(async () => {
    try {
      const quotes = await marketDataManager.getBatchQuotes(symbols);
      res.write(`event: live_tick\ndata: ${JSON.stringify({ quotes, timestamp: Date.now() })}\n\n`);
    } catch (e) {}
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// ----------------------------------------------------
// WATCHLISTS
// ----------------------------------------------------

router.get('/watchlists', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const watchlists = await DataRepository.getWatchlists(req.userId!);
    return res.json({ watchlists });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/watchlists', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, symbols } = req.body;
    if (!name) return res.status(400).json({ error: 'Watchlist name is required' });

    const created = await DataRepository.createWatchlist({
      userId: req.userId!,
      name,
      symbols: symbols || [],
    });
    return res.status(201).json(created);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/watchlists/:id/symbols', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { symbols } = req.body;
    if (!Array.isArray(symbols)) return res.status(400).json({ error: 'symbols array is required' });

    const updated = await DataRepository.updateWatchlistSymbols(req.params.id, symbols);
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/watchlists/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const success = await DataRepository.deleteWatchlist(req.params.id, req.userId!);
    return res.json({ success });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// ----------------------------------------------------
// REAL-TIME PRICE ALERTS
// ----------------------------------------------------

router.get('/alerts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const alerts = await DataRepository.getAlerts(req.userId!);
    // Fetch quotes for distinct symbols to show live distance to target
    const symbols = Array.from(new Set(alerts.map((a: any) => a.symbol)));
    const quotes = symbols.length > 0 ? await marketDataManager.getBatchQuotes(symbols) : {};

    const enriched = alerts.map((a: any) => {
      const q = quotes[a.symbol];
      const curPrice = q?.price || a.lastEvaluatedPrice || a.threshold;
      let distancePct = 0;
      if (curPrice > 0) {
        distancePct = Number((((a.threshold - curPrice) / curPrice) * 100).toFixed(2));
      }
      return {
        ...(a._doc ? a._doc : a),
        currentPrice: curPrice,
        dayChangePercent: q?.changePercent || 0,
        distancePct,
      };
    });

    return res.json({ alerts: enriched });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/alerts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { symbol, condition, threshold, note } = req.body;
    if (!symbol || !condition || threshold === undefined || isNaN(parseFloat(threshold))) {
      return res.status(400).json({ error: 'Valid symbol, condition (ABOVE/BELOW), and numeric target threshold are required' });
    }

    const numThreshold = parseFloat(threshold);
    if (numThreshold <= 0) {
      return res.status(400).json({ error: 'Threshold price must be greater than zero' });
    }

    const symUpper = symbol.toUpperCase().trim();
    const inst = await DataRepository.getInstrumentBySymbol(symUpper);

    const alert = await DataRepository.createAlert({
      userId: req.userId!,
      symbol: symUpper,
      exchange: inst?.exchange || 'NSE',
      condition,
      threshold: numThreshold,
      note: note ? note.trim() : undefined,
    });

    // Register into AlertEngine for live monitoring
    alertEngine.registerAlert(alert);

    // Evaluate immediately against current quote if available
    const curQuote = await marketDataManager.getQuote(symUpper);
    if (curQuote) {
      await alertEngine.evaluateQuote(curQuote);
    }

    return res.status(201).json(alert);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/alerts/:id/toggle', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await DataRepository.toggleAlertPause(req.params.id, req.userId!);
    if (!updated) return res.status(404).json({ error: 'Alert not found' });

    if (updated.status === 'ACTIVE') {
      alertEngine.registerAlert(updated);
    } else {
      alertEngine.unregisterAlert(updated._id.toString(), updated.symbol);
    }

    return res.json({ alert: updated });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/alerts/:id/reactivate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { threshold, condition } = req.body;
    const numThreshold = threshold ? parseFloat(threshold) : undefined;
    const updated = await DataRepository.reactivateAlert(req.params.id, req.userId!, numThreshold, condition);
    if (!updated) return res.status(404).json({ error: 'Alert not found' });

    alertEngine.registerAlert(updated);
    return res.json({ alert: updated });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/alerts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const alerts = await DataRepository.getAlerts(req.userId!);
    const alert = alerts.find((a: any) => a._id.toString() === req.params.id);
    if (alert) {
      alertEngine.unregisterAlert(alert._id.toString(), alert.symbol);
    }

    const success = await DataRepository.deleteAlert(req.params.id, req.userId!);
    return res.json({ success });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Real-Time Server-Sent Events (SSE) Stream for Alerts & Notifications
router.get('/alerts/stream', (req: Request, res: Response) => {
  let token = req.query.token as string;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required for alert stream' });
  }

  let userId: string;
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid stream token' });
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  // Listener for alerts triggered for this user
  const onUserAlert = (eventData: any) => {
    res.write(`event: alert_triggered\ndata: ${JSON.stringify(eventData)}\n\n`);
  };

  alertEngine.on(`user_${userId}`, onUserAlert);

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    alertEngine.off(`user_${userId}`, onUserAlert);
  });
});

// ----------------------------------------------------
// PAPER TRADING SIMULATOR & EXECUTION ENGINE
// ----------------------------------------------------

router.get('/paper/account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let account = await DataRepository.getPaperAccount(req.userId!);
    if (!account) {
      account = await DataRepository.initPaperAccount(req.userId!);
    }

    const holdings = await DataRepository.getHoldings(req.userId!);
    const symbols = holdings.map((h: any) => h.symbol);
    const quotes = await marketDataManager.getBatchQuotes(symbols);

    let totalHoldingsValue = 0;
    let totalInvestedValue = 0;
    let totalUnrealizedPnL = 0;

    for (const h of holdings) {
      const q = quotes[h.symbol];
      const currentPrice = q ? q.price : h.averagePrice;
      const currentValue = currentPrice * h.quantity;
      const invested = h.totalCost;
      const unrealized = currentValue - invested;

      totalHoldingsValue += currentValue;
      totalInvestedValue += invested;
      totalUnrealizedPnL += unrealized;
    }

    const portfolioTotalValue = (account.availableCash || 0) + totalHoldingsValue;

    return res.json({
      account: {
        ...account,
        totalInvestedValue: Number(totalInvestedValue.toFixed(2)),
        totalHoldingsValue: Number(totalHoldingsValue.toFixed(2)),
        totalUnrealizedPnL: Number(totalUnrealizedPnL.toFixed(2)),
        portfolioTotalValue: Number(portfolioTotalValue.toFixed(2)),
        pnlPercentage: totalInvestedValue > 0 ? Number(((totalUnrealizedPnL / totalInvestedValue) * 100).toFixed(2)) : 0,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Deposit Funds via Card / UPI / NetBanking
router.post('/paper/deposit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, paymentMethod, details } = req.body;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid deposit amount greater than ₹0' });
    }

    if (!paymentMethod || !['CARD', 'UPI', 'NET_BANKING'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method. Choose CARD, UPI, or NET_BANKING.' });
    }

    const result = await DataRepository.recordDeposit({
      userId: req.userId!,
      amount: parsedAmount,
      paymentMethod,
      details: details || {},
    });

    return res.status(201).json({
      success: true,
      message: `₹${parsedAmount.toLocaleString('en-IN')} added to your trading account successfully!`,
      deposit: result.deposit,
      account: result.account,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Deposit failed' });
  }
});

router.get('/paper/deposits', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const deposits = await DataRepository.getDepositHistory(req.userId!);
    return res.json({ deposits });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/paper/holdings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const holdings = await DataRepository.getHoldings(req.userId!);
    const symbols = holdings.map((h: any) => h.symbol);
    const quotes = await marketDataManager.getBatchQuotes(symbols);

    const enrichedHoldings = holdings.map((h: any) => {
      const q = quotes[h.symbol];
      const currentPrice = q ? q.price : h.averagePrice;
      const currentValue = Number((currentPrice * h.quantity).toFixed(2));
      const pnl = Number((currentValue - h.totalCost).toFixed(2));
      const pnlPct = h.totalCost > 0 ? Number(((pnl / h.totalCost) * 100).toFixed(2)) : 0;
      const dayChange = q ? Number((q.change * h.quantity).toFixed(2)) : 0;

      return {
        ...h,
        currentPrice,
        currentValue,
        pnl,
        pnlPct,
        dayChange,
        dataStatus: q?.dataStatus || 'DEMO',
      };
    });

    return res.json({ holdings: enrichedHoldings });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/paper/orders', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await DataRepository.getOrders(req.userId!);
    return res.json({ orders });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/paper/orders', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { symbol, side, orderType, quantity, limitPrice, triggerPrice, productType, idempotencyKey } = req.body;

    if (!symbol || !side || !orderType || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid symbol, side, orderType, and positive quantity required' });
    }

    const symUpper = symbol.toUpperCase().trim();
    const qty = parseInt(quantity, 10);
    const quote = await marketDataManager.getQuote(symUpper);

    if (!quote) {
      return res.status(400).json({ error: `Market quote unavailable for ${symUpper}` });
    }

    const account = await DataRepository.getPaperAccount(req.userId!);
    if (!account) {
      return res.status(400).json({ error: 'Paper trading account not found' });
    }

    // Estimate Execution Price & Charges
    let execPrice = quote.price;
    if (orderType === 'LIMIT') {
      if (!limitPrice || limitPrice <= 0) {
        return res.status(400).json({ error: 'Limit price required for LIMIT order' });
      }
      execPrice = parseFloat(limitPrice);
    }

    const orderValue = execPrice * qty;
    // Transparent regulatory simulation charges: STT 0.1% for delivery, GST + exchange turnover ~ 0.03%
    const estimatedCharges = Number((orderValue * 0.0013).toFixed(2));
    const totalRequiredFunds = orderValue + estimatedCharges;

    // BUY Validation
    if (side === 'BUY') {
      if (account.availableCash < totalRequiredFunds) {
        return res.status(400).json({
          error: `Insufficient virtual cash. Required: ₹${totalRequiredFunds.toLocaleString('en-IN')}, Available: ₹${account.availableCash.toLocaleString('en-IN')}`,
        });
      }
    }

    // SELL Validation
    if (side === 'SELL') {
      const holdings = await DataRepository.getHoldings(req.userId!);
      const holding = holdings.find((h: any) => h.symbol === symUpper && h.productType === (productType || 'CNC'));
      if (!holding || holding.quantity < qty) {
        return res.status(400).json({
          error: `Insufficient holdings. You own ${holding ? holding.quantity : 0} shares of ${symUpper}`,
        });
      }
    }

    // Create Order Record
    const order = await DataRepository.createOrder({
      userId: req.userId!,
      paperAccountId: account._id.toString(),
      symbol: symUpper,
      exchange: 'NSE',
      side,
      orderType,
      productType: productType || 'CNC',
      quantity: qty,
      limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
      triggerPrice: triggerPrice ? parseFloat(triggerPrice) : undefined,
      status: 'PENDING',
      estimatedCharges,
      idempotencyKey,
    });

    // Determine Immediate Execution:
    // MARKET executes immediately.
    // LIMIT executes immediately if buy limit >= current price OR sell limit <= current price
    let shouldExecute = false;
    if (orderType === 'MARKET') {
      shouldExecute = true;
    } else if (orderType === 'LIMIT') {
      if (side === 'BUY' && limitPrice >= quote.price) shouldExecute = true;
      if (side === 'SELL' && limitPrice <= quote.price) shouldExecute = true;
    }

    if (shouldExecute) {
      const executionPrice = orderType === 'MARKET' ? quote.price : limitPrice;
      const fillTotal = executionPrice * qty;

      if (side === 'BUY') {
        const newCash = account.availableCash - (fillTotal + estimatedCharges);
        await DataRepository.updatePaperCash(req.userId!, Number(newCash.toFixed(2)));
        await DataRepository.addHolding({
          userId: req.userId!,
          symbol: symUpper,
          exchange: 'NSE',
          quantity: qty,
          averagePrice: executionPrice,
          totalCost: fillTotal,
          realizedPnL: 0,
          productType: productType || 'CNC',
        });
      } else {
        // Sell
        const sellResult = await DataRepository.updateHoldingOnSell(req.userId!, symUpper, qty, executionPrice, productType || 'CNC');
        const newCash = account.availableCash + (fillTotal - estimatedCharges);
        await DataRepository.updatePaperCash(req.userId!, Number(newCash.toFixed(2)));
      }

      await DataRepository.updateOrderStatus(order._id.toString(), 'EXECUTED', executionPrice);
      await DataRepository.addTradeFill({
        orderId: order._id.toString(),
        userId: req.userId!,
        symbol: symUpper,
        exchange: 'NSE',
        side,
        quantity: qty,
        fillPrice: executionPrice,
        charges: estimatedCharges,
      });

      await DataRepository.createNotification({
        userId: req.userId!,
        type: 'ORDER_FILL',
        title: `Order Executed: ${side} ${qty} ${symUpper}`,
        message: `${side} order for ${qty} shares of ${symUpper} filled at ₹${executionPrice.toFixed(2)} (Val: ₹${fillTotal.toLocaleString('en-IN')}).`,
      });

      return res.status(201).json({
        order: {
          ...order,
          status: 'EXECUTED',
          executedPrice: executionPrice,
        },
        message: `Order filled at ₹${executionPrice.toFixed(2)}`,
      });
    }

    // If pending limit order, reserve the cash for BUY
    if (side === 'BUY') {
      const newCash = account.availableCash - totalRequiredFunds;
      const newReserved = (account.reservedCash || 0) + totalRequiredFunds;
      await DataRepository.updatePaperCash(req.userId!, Number(newCash.toFixed(2)), Number(newReserved.toFixed(2)));
    }

    return res.status(201).json({
      order,
      message: 'Order placed in order book (Pending Trigger/Limit)',
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Order failed' });
  }
});

router.post('/paper/orders/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await DataRepository.getOrders(req.userId!);
    const order = orders.find((o: any) => o._id.toString() === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot cancel order with status ${order.status}` });
    }

    // Refund reserved cash if buy
    if (order.side === 'BUY') {
      const account = await DataRepository.getPaperAccount(req.userId!);
      if (account) {
        const refund = order.limitPrice * order.quantity + (order.estimatedCharges || 0);
        const newCash = account.availableCash + refund;
        const newReserved = Math.max(0, (account.reservedCash || 0) - refund);
        await DataRepository.updatePaperCash(req.userId!, Number(newCash.toFixed(2)), Number(newReserved.toFixed(2)));
      }
    }

    await DataRepository.updateOrderStatus(order._id.toString(), 'CANCELLED');
    return res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/paper/reset', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await DataRepository.updatePaperCash(req.userId!, 1000000, 0);
    // Clear holdings
    const holdings = await DataRepository.getHoldings(req.userId!);
    for (const h of holdings) {
      await DataRepository.updateHoldingOnSell(req.userId!, h.symbol, h.quantity, h.averagePrice, h.productType);
    }
    return res.json({ message: 'Virtual funds reset to ₹10,00,000' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// AI RESEARCH & QUANTITATIVE PREDICTION ENGINE
// ----------------------------------------------------

router.get('/ai/research/:symbol', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const inst = await DataRepository.getInstrumentBySymbol(sym);
    if (!inst) return res.status(404).json({ error: `Instrument ${sym} not found` });

    const quote = await marketDataManager.getQuote(sym);
    const candleData = await marketDataManager.getHistoricalCandles(sym, '1d', '6M');
    const technicals = computeTechnicalIndicators(candleData.candles);

    const report = await generateStockResearch(
      sym,
      inst.companyName,
      inst.sector,
      quote,
      technicals,
      candleData.candles
    );

    if (req.userId) {
      await DataRepository.saveAIResearch({
        userId: req.userId,
        symbol: sym,
        companyName: inst.companyName,
        overview: report.overview,
        technicalInterpretation: report.technicalInterpretation,
        scenarios: report.scenarios,
        risksAndUncertainties: report.risksAndUncertainties,
        dataSource: report.dataSource,
      });
    }

    return res.json({ report });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/ai/chat', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { question, symbol } = req.body;
    if (!question || !symbol) {
      return res.status(400).json({ error: 'Question and symbol are required' });
    }

    const symUpper = symbol.toUpperCase();
    const inst = await DataRepository.getInstrumentBySymbol(symUpper);
    const quote = await marketDataManager.getQuote(symUpper);
    const candleData = await marketDataManager.getHistoricalCandles(symUpper, '1d', '3M');
    const technicals = computeTechnicalIndicators(candleData.candles);

    const answer = await askStockAssistant(question, {
      symbol: symUpper,
      companyName: inst?.companyName || symUpper,
      sector: inst?.sector || 'Equities',
      quote,
      technicals,
    });

    return res.json({ answer });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/ai/prediction/:symbol', async (req: Request, res: Response) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const horizon = (req.query.horizon as any) || '5_SESSIONS';

    const candleData = await marketDataManager.getHistoricalCandles(sym, '1d', '1Y');
    const prediction = runQuantitativePrediction(sym, candleData.candles, horizon);

    await DataRepository.savePrediction(prediction);
    return res.json({ prediction, dataStatus: candleData.dataStatus });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// TRADING JOURNAL
// ----------------------------------------------------

router.get('/journal', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const entries = await DataRepository.getJournalEntries(req.userId!);
    return res.json({ entries });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/journal', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { symbol, thesis, entryReason, exitReason, strategyTags, lessonsLearned, pnl, rating } = req.body;
    if (!symbol || !thesis || !entryReason) {
      return res.status(400).json({ error: 'Symbol, trade thesis, and entry reason are required' });
    }

    const entry = await DataRepository.createJournalEntry({
      userId: req.userId!,
      symbol: symbol.toUpperCase(),
      thesis,
      entryReason,
      exitReason,
      strategyTags: strategyTags || [],
      lessonsLearned,
      pnl: pnl ? parseFloat(pnl) : undefined,
      rating: rating ? parseInt(rating, 10) : undefined,
    });
    return res.status(201).json(entry);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------

router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await DataRepository.getNotifications(req.userId!);
    return res.json({ notifications });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await DataRepository.markNotificationRead(req.params.id, req.userId!);
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// DATABASE & INFRASTRUCTURE DIAGNOSTICS
// ----------------------------------------------------

router.get('/system/db-status', async (req: Request, res: Response) => {
  try {
    const status = getDatabaseState();
    const instResult = await DataRepository.getInstruments({ limit: 1 });
    const alerts = await DataRepository.getAllActiveAlerts();
    return res.json({
      ...status,
      stats: {
        instrumentsCount: instResult.total,
        activeAlertsCount: alerts.length,
        provider: process.env.MARKET_DATA_PROVIDER || 'DEMO',
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/system/connect-mongodb', async (req: Request, res: Response) => {
  try {
    const { mongoUri, persistToEnv } = req.body;
    if (!mongoUri || typeof mongoUri !== 'string' || mongoUri.trim().length === 0) {
      return res.status(400).json({ error: 'Valid MongoDB Atlas connection URI is required' });
    }

    if (persistToEnv !== false) {
      saveMongoUriToEnv(mongoUri.trim());
    }

    const state = await connectToDatabase(mongoUri.trim());

    if (state.type === 'MONGODB_ATLAS' && state.readyState === 1) {
      // Synchronize database schemas and re-seed universe if empty
      await DataRepository.init();
      await alertEngine.init();

      return res.json({
        success: true,
        message: 'Successfully connected to MongoDB Atlas! TradeNova database is live.',
        dbState: state,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: state.error || 'Failed to establish connection to MongoDB Atlas host',
        dbState: state,
      });
    }
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
