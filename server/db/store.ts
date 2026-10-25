import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { dbState } from './connection.js';
import {
  UserModel,
  InstrumentModel,
  WatchlistModel,
  PriceAlertModel,
  PaperAccountModel,
  OrderModel,
  TradeFillModel,
  HoldingModel,
  AIResearchModel,
  PredictionModel,
  TradingJournalModel,
  NotificationModel,
  DepositTransactionModel,
} from '../models/schemas.js';
import { INDIAN_STOCKS_SEED, SeedStock } from '../data/indianStocksSeed.js';

// In-Memory fallback collections
const localUsers: any[] = [];
const localInstruments: any[] = [];
const localWatchlists: any[] = [];
const localAlerts: any[] = [];
const localPaperAccounts: any[] = [];
const localDeposits: any[] = [];
const localOrders: any[] = [];
const localFills: any[] = [];
const localHoldings: any[] = [];
const localResearch: any[] = [];
const localPredictions: any[] = [];
const localJournal: any[] = [];
const localNotifications: any[] = [];

let isInitialized = false;

function generateId(): string {
  return new mongoose.Types.ObjectId().toString();
}

function computeValuationMetrics(s: SeedStock): {
  marketCapCategory: 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP';
  peRatio: number;
  dividendYield: number;
} {
  const cap = s.marketCapCr || 0;
  const category: 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP' =
    cap >= 20000 ? 'LARGE_CAP' : cap >= 5000 ? 'MID_CAP' : 'SMALL_CAP';

  const hash = s.symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const sec = s.sector.toLowerCase();

  let basePe = 22;
  let baseYield = 1.2;

  if (sec.includes('information technology') || sec.includes('software')) {
    basePe = 27 + (hash % 18);
    baseYield = 1.4 + ((hash % 16) / 10);
  } else if (sec.includes('fmcg') || sec.includes('food')) {
    basePe = 40 + (hash % 24);
    baseYield = 1.5 + ((hash % 18) / 10);
  } else if (sec.includes('banking') || sec.includes('financial')) {
    if (s.industry.toLowerCase().includes('public') || s.companyName.toLowerCase().includes('bank of') || s.symbol === 'SBIN') {
      basePe = 7.2 + ((hash % 45) / 10);
      baseYield = 2.4 + ((hash % 20) / 10);
    } else {
      basePe = 16.5 + ((hash % 65) / 10);
      baseYield = 1.0 + ((hash % 15) / 10);
    }
  } else if (sec.includes('metals') || sec.includes('mining')) {
    basePe = 8.5 + (hash % 8);
    baseYield = 3.2 + ((hash % 45) / 10);
  } else if (sec.includes('oil') || sec.includes('gas') || sec.includes('energy')) {
    basePe = 8.0 + (hash % 9);
    baseYield = 3.0 + ((hash % 40) / 10);
  } else if (sec.includes('pharma') || sec.includes('healthcare')) {
    basePe = 27 + (hash % 16);
    baseYield = 0.9 + ((hash % 14) / 10);
  } else if (sec.includes('auto')) {
    basePe = 19 + (hash % 15);
    baseYield = 1.1 + ((hash % 16) / 10);
  } else if (sec.includes('consumer durables') || sec.includes('retail') || sec.includes('e-commerce')) {
    basePe = 45 + (hash % 38);
    baseYield = 0.4 + ((hash % 12) / 10);
  } else if (sec.includes('power') || sec.includes('utilities') || sec.includes('renewable')) {
    basePe = 16 + (hash % 20);
    baseYield = 2.1 + ((hash % 25) / 10);
  } else {
    basePe = 20 + (hash % 16);
    baseYield = 1.2 + ((hash % 20) / 10);
  }

  // Known high dividend payers & benchmark leaders
  if (s.symbol === 'COALINDIA') {
    basePe = 8.2;
    baseYield = 6.85;
  } else if (s.symbol === 'IOC' || s.symbol === 'BPCL') {
    baseYield = 5.4;
  } else if (s.symbol === 'ITC') {
    basePe = 26.5;
    baseYield = 3.25;
  } else if (s.symbol === 'TCS') {
    basePe = 29.8;
    baseYield = 1.85;
  } else if (s.symbol === 'INFY') {
    basePe = 27.2;
    baseYield = 2.45;
  } else if (s.symbol === 'HDFCBANK') {
    basePe = 19.4;
    baseYield = 1.20;
  }

  return {
    marketCapCategory: category,
    peRatio: Number(basePe.toFixed(1)),
    dividendYield: Number(baseYield.toFixed(2)),
  };
}

export const DataRepository = {
  async init() {
    if (isInitialized) return;

    // Seed instruments into local or mongo
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        const count = await InstrumentModel.countDocuments();
        if (count === 0) {
          console.log(`[Store] Seeding ${INDIAN_STOCKS_SEED.length} Indian stocks to MongoDB Atlas...`);
          await InstrumentModel.insertMany(
            INDIAN_STOCKS_SEED.map((s) => {
              const val = computeValuationMetrics(s);
              return {
                ...s,
                ...val,
                lotSize: 1,
                tickSize: 0.05,
              };
            })
          );
          console.log('[Store] Seed completed in MongoDB Atlas.');
        }
      } catch (e: any) {
        console.error('[Store] MongoDB seed error:', e.message);
      }
    }

    // Always seed local instruments so quick searches & fallbacks are instant
    if (localInstruments.length === 0) {
      INDIAN_STOCKS_SEED.forEach((s) => {
        const val = computeValuationMetrics(s);
        localInstruments.push({
          _id: generateId(),
          ...s,
          ...val,
          lotSize: 1,
          tickSize: 0.05,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
      console.log(`[Store] Seeded ${localInstruments.length} verified Indian stocks with valuation metrics into store.`);
    }

    // Ensure Default Demo User exists
    await this.ensureDemoUser();

    isInitialized = true;
  },

  async ensureDemoUser() {
    const email = 'trader@tradenova.in';
    const existing = await this.findUserByEmail(email);
    if (!existing) {
      const passwordHash = await bcrypt.hash('tradenova2026', 10);
      const user = await this.createUser({
        name: 'Arjun Mehta',
        email,
        passwordHash,
        phone: '+91 98765 43210',
        role: 'user',
        preferences: {
          theme: 'dark',
          accentColor: '#10B981',
          chartStyle: 'candlestick',
        },
      });

      // Default watchlists
      await this.createWatchlist({
        userId: user._id.toString(),
        name: 'NIFTY Giants',
        isDefault: true,
        symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'LT', 'SBIN', 'ITC', 'MARUTI'],
      });

      await this.createWatchlist({
        userId: user._id.toString(),
        name: 'High Momentum',
        isDefault: false,
        symbols: ['ZOMATO', 'TRENT', 'HAL', 'BEL', 'SUZLON', 'DIXON', 'KAYNES', 'RVNL'],
      });

      // Add a couple of initial paper trade holdings for a rich first-run view
      await this.addHolding({
        userId: user._id.toString(),
        symbol: 'RELIANCE',
        exchange: 'NSE',
        quantity: 50,
        averagePrice: 2710.00,
        totalCost: 135500.00,
        realizedPnL: 0,
        productType: 'CNC',
      });

      await this.addHolding({
        userId: user._id.toString(),
        symbol: 'TCS',
        exchange: 'NSE',
        quantity: 25,
        averagePrice: 4050.00,
        totalCost: 101250.00,
        realizedPnL: 0,
        productType: 'CNC',
      });

      await this.addHolding({
        userId: user._id.toString(),
        symbol: 'HDFCBANK',
        exchange: 'NSE',
        quantity: 100,
        averagePrice: 1680.00,
        totalCost: 168000.00,
        realizedPnL: 0,
        productType: 'CNC',
      });

      // Deduct used cash from paper account
      const totalInitialCost = 135500 + 101250 + 168000;
      await this.updatePaperCash(user._id.toString(), 1000000 - totalInitialCost);

      // Add welcome notification
      await this.createNotification({
        userId: user._id.toString(),
        type: 'SYSTEM',
        title: 'Welcome to TradeNova Terminal',
        message: 'Your account is loaded with ₹10,00,000 in virtual funds. Explore 260+ Indian stocks, run technical charts, and try AI stock analysis.',
      });

      console.log(`[Store] Seeded default demo user ${email}`);
    }
  },

  // Users
  async findUserByEmail(email: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await UserModel.findOne({ email: email.toLowerCase() });
      } catch (e) {
        // fallback
      }
    }
    return localUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await UserModel.findById(id);
      } catch (e) {
        // fallback
      }
    }
    return localUsers.find((u) => u._id.toString() === id.toString()) || null;
  },

  async createUser(data: any) {
    const id = generateId();
    const now = new Date();
    const newUser = {
      _id: id,
      ...data,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    };

    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        const created = await UserModel.create(data);
        await this.initPaperAccount(created._id.toString());
        return created;
      } catch (e: any) {
        console.error('[Store] MongoDB create user failed, using local store:', e.message);
      }
    }

    localUsers.push(newUser);
    await this.initPaperAccount(id);
    return newUser;
  },

  async updateUserPreferences(userId: string, preferences: any) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await UserModel.findByIdAndUpdate(userId, { $set: { preferences } }, { new: true });
      } catch (e) {}
    }
    const user = localUsers.find((u) => u._id.toString() === userId.toString());
    if (user) {
      user.preferences = { ...user.preferences, ...preferences };
      user.updatedAt = new Date();
      return user;
    }
    return null;
  },

  // Instruments
  async getInstruments(params: {
    search?: string;
    sector?: string;
    exchange?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    minPrice?: number;
    maxPrice?: number;
    capCategory?: 'ALL' | 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP' | string;
    minPe?: number;
    maxPe?: number;
    minDividendYield?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 25;
    const skip = (page - 1) * limit;

    let items = localInstruments.map((i) => {
      if (!i.marketCapCategory || i.peRatio === undefined || i.dividendYield === undefined) {
        const val = computeValuationMetrics(i as any);
        i.marketCapCategory = val.marketCapCategory;
        i.peRatio = val.peRatio;
        i.dividendYield = val.dividendYield;
      }
      return i;
    });

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (i) => i.symbol.toLowerCase().includes(q) || i.companyName.toLowerCase().includes(q)
      );
    }

    if (params.sector && params.sector !== 'ALL') {
      items = items.filter((i) => i.sector.toLowerCase() === params.sector!.toLowerCase());
    }

    if (params.exchange && params.exchange !== 'ALL') {
      items = items.filter((i) => i.exchange === params.exchange);
    }

    if (params.capCategory && params.capCategory !== 'ALL') {
      items = items.filter((i) => i.marketCapCategory === params.capCategory);
    }

    if (params.minPrice !== undefined && params.minPrice > 0) {
      items = items.filter((i) => i.basePrice >= params.minPrice!);
    }

    if (params.maxPrice !== undefined && params.maxPrice > 0) {
      items = items.filter((i) => i.basePrice <= params.maxPrice!);
    }

    if (params.minPe !== undefined && !isNaN(params.minPe)) {
      items = items.filter((i) => (i.peRatio ?? 0) >= params.minPe!);
    }

    if (params.maxPe !== undefined && !isNaN(params.maxPe)) {
      items = items.filter((i) => (i.peRatio ?? 0) <= params.maxPe!);
    }

    if (params.minDividendYield !== undefined && !isNaN(params.minDividendYield)) {
      items = items.filter((i) => (i.dividendYield ?? 0) >= params.minDividendYield!);
    }

    // Sort
    const sortBy = params.sortBy || 'marketCapCr';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

    items.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') {
        return sortOrder * valA.localeCompare(valB);
      }
      return sortOrder * ((valA ?? 0) - (valB ?? 0));
    });

    const total = items.length;
    const paginated = items.slice(skip, skip + limit);

    return {
      instruments: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      sectors: Array.from(new Set(localInstruments.map((i) => i.sector))).sort(),
    };
  },

  async getInstrumentBySymbol(symbol: string) {
    const upper = symbol.toUpperCase().trim();
    return localInstruments.find((i) => i.symbol === upper) || null;
  },

  // Watchlists
  async getWatchlists(userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        const list = await WatchlistModel.find({ userId });
        if (list.length > 0) return list;
      } catch (e) {}
    }
    return localWatchlists.filter((w) => w.userId === userId);
  },

  async createWatchlist(data: { userId: string; name: string; symbols: string[]; isDefault?: boolean }) {
    const id = generateId();
    const wl = {
      _id: id,
      ...data,
      isDefault: data.isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await WatchlistModel.create(data);
      } catch (e) {}
    }
    localWatchlists.push(wl);
    return wl;
  },

  async updateWatchlistSymbols(watchlistId: string, symbols: string[]) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await WatchlistModel.findByIdAndUpdate(watchlistId, { $set: { symbols } }, { new: true });
      } catch (e) {}
    }
    const wl = localWatchlists.find((w) => w._id.toString() === watchlistId.toString());
    if (wl) {
      wl.symbols = symbols;
      wl.updatedAt = new Date();
      return wl;
    }
    return null;
  },

  async deleteWatchlist(watchlistId: string, userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        await WatchlistModel.deleteOne({ _id: watchlistId, userId });
        return true;
      } catch (e) {}
    }
    const idx = localWatchlists.findIndex((w) => w._id.toString() === watchlistId.toString() && w.userId === userId);
    if (idx !== -1) {
      localWatchlists.splice(idx, 1);
      return true;
    }
    return false;
  },

  // Price Alerts
  async getAllActiveAlerts() {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await PriceAlertModel.find({ status: 'ACTIVE' });
      } catch (e) {}
    }
    return localAlerts.filter((a) => a.status === 'ACTIVE');
  },

  async getAlerts(userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await PriceAlertModel.find({ userId }).sort({ createdAt: -1 });
      } catch (e) {}
    }
    return localAlerts.filter((a) => a.userId === userId);
  },

  async createAlert(data: any) {
    const id = generateId();
    const alert = {
      _id: id,
      ...data,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await PriceAlertModel.create(alert);
      } catch (e) {}
    }
    localAlerts.unshift(alert);
    return alert;
  },

  async updateAlertStatus(alertId: string, status: string, triggeredPrice?: number) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await PriceAlertModel.findByIdAndUpdate(
          alertId,
          { $set: { status, lastEvaluatedPrice: triggeredPrice, triggeredAt: new Date() } },
          { new: true }
        );
      } catch (e) {}
    }
    const alert = localAlerts.find((a) => a._id.toString() === alertId.toString());
    if (alert) {
      alert.status = status;
      if (triggeredPrice) alert.lastEvaluatedPrice = triggeredPrice;
      alert.triggeredAt = new Date();
      return alert;
    }
    return null;
  },

  async toggleAlertPause(alertId: string, userId: string) {
    let currentStatus = 'ACTIVE';
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        const doc = await PriceAlertModel.findOne({ _id: alertId, userId });
        if (doc) {
          const nextStatus = doc.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          doc.status = nextStatus;
          doc.updatedAt = new Date();
          await doc.save();
          return doc;
        }
      } catch (e) {}
    }

    const alert = localAlerts.find((a) => a._id.toString() === alertId.toString() && a.userId === userId);
    if (alert) {
      alert.status = alert.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      alert.updatedAt = new Date();
      return alert;
    }
    return null;
  },

  async reactivateAlert(alertId: string, userId: string, newThreshold?: number, newCondition?: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        const update: any = { status: 'ACTIVE', triggeredAt: null, lastEvaluatedPrice: null, updatedAt: new Date() };
        if (newThreshold) update.threshold = newThreshold;
        if (newCondition) update.condition = newCondition;
        return await PriceAlertModel.findOneAndUpdate({ _id: alertId, userId }, { $set: update }, { new: true });
      } catch (e) {}
    }

    const alert = localAlerts.find((a) => a._id.toString() === alertId.toString() && a.userId === userId);
    if (alert) {
      alert.status = 'ACTIVE';
      alert.triggeredAt = null;
      alert.lastEvaluatedPrice = null;
      if (newThreshold) alert.threshold = newThreshold;
      if (newCondition) alert.condition = newCondition;
      alert.updatedAt = new Date();
      return alert;
    }
    return null;
  },

  async deleteAlert(alertId: string, userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        await PriceAlertModel.deleteOne({ _id: alertId, userId });
        return true;
      } catch (e) {}
    }
    const idx = localAlerts.findIndex((a) => a._id.toString() === alertId.toString() && a.userId === userId);
    if (idx !== -1) {
      localAlerts.splice(idx, 1);
      return true;
    }
    return false;
  },

  // Paper Trading Accounts & Balance
  async initPaperAccount(userId: string) {
    const existing = await this.getPaperAccount(userId);
    if (existing) return existing;

    const id = generateId();
    const account = {
      _id: id,
      userId,
      initialCash: 1000000,
      availableCash: 1000000,
      reservedCash: 0,
      currency: 'INR',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await PaperAccountModel.create(account);
      } catch (e) {}
    }
    localPaperAccounts.push(account);
    return account;
  },

  async getPaperAccount(userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        const acc = await PaperAccountModel.findOne({ userId });
        if (acc) return acc;
      } catch (e) {}
    }
    return localPaperAccounts.find((a) => a.userId === userId) || null;
  },

  async updatePaperCash(userId: string, newAvailableCash: number, newReservedCash?: number) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        const updates: any = { availableCash: newAvailableCash };
        if (newReservedCash !== undefined) updates.reservedCash = newReservedCash;
        return await PaperAccountModel.findOneAndUpdate({ userId }, { $set: updates }, { new: true });
      } catch (e) {}
    }
    const acc = localPaperAccounts.find((a) => a.userId === userId);
    if (acc) {
      acc.availableCash = newAvailableCash;
      if (newReservedCash !== undefined) acc.reservedCash = newReservedCash;
      acc.updatedAt = new Date();
      return acc;
    }
    return null;
  },

  async recordDeposit(data: {
    userId: string;
    amount: number;
    paymentMethod: 'CARD' | 'UPI' | 'NET_BANKING';
    details: {
      cardLast4?: string;
      cardNetwork?: string;
      cardHolder?: string;
      upiId?: string;
      bankName?: string;
    };
  }) {
    const paymentReference = `TN_DEP_${Date.now()}_${Math.floor(Math.random() * 8999 + 1000)}`;
    const depositDoc = {
      _id: generateId(),
      userId: data.userId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      status: 'SUCCESS',
      paymentReference,
      details: data.details,
      createdAt: new Date(),
    };

    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        await DepositTransactionModel.create(depositDoc);
        let acc = await PaperAccountModel.findOne({ userId: data.userId });
        if (!acc) {
          acc = await PaperAccountModel.create({
            userId: data.userId,
            initialCash: data.amount,
            availableCash: data.amount,
            reservedCash: 0,
            currency: 'INR',
          });
        } else {
          acc.availableCash = (acc.availableCash || 0) + data.amount;
          acc.initialCash = (acc.initialCash || 0) + data.amount;
          await acc.save();
        }

        await this.createNotification({
          userId: data.userId,
          type: 'FUNDS_DEPOSITED',
          title: '₹' + data.amount.toLocaleString('en-IN') + ' Deposited via ' + data.paymentMethod,
          message: 'Your trading wallet balance has been topped up successfully with ₹' + data.amount.toLocaleString('en-IN') + '. Ref: ' + paymentReference,
        });

        return { deposit: depositDoc, account: acc };
      } catch (err: any) {
        console.error('[Store] Deposit recording in MongoDB failed:', err.message);
      }
    }

    localDeposits.unshift(depositDoc);
    let acc = localPaperAccounts.find((a) => a.userId === data.userId);
    if (!acc) {
      acc = {
        _id: generateId(),
        userId: data.userId,
        initialCash: data.amount,
        availableCash: data.amount,
        reservedCash: 0,
        currency: 'INR',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      localPaperAccounts.push(acc);
    } else {
      acc.availableCash = (acc.availableCash || 0) + data.amount;
      acc.initialCash = (acc.initialCash || 0) + data.amount;
      acc.updatedAt = new Date();
    }

    await this.createNotification({
      userId: data.userId,
      type: 'FUNDS_DEPOSITED',
      title: '₹' + data.amount.toLocaleString('en-IN') + ' Deposited via ' + data.paymentMethod,
      message: 'Your trading wallet balance has been topped up successfully with ₹' + data.amount.toLocaleString('en-IN') + '. Ref: ' + paymentReference,
    });

    return { deposit: depositDoc, account: acc };
  },

  async getDepositHistory(userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await DepositTransactionModel.find({ userId }).sort({ createdAt: -1 }).limit(50);
      } catch (e) {}
    }
    return localDeposits.filter((d) => d.userId === userId).slice(0, 50);
  },

  // Orders & Fills
  async createOrder(data: any) {
    const id = generateId();
    const order = {
      _id: id,
      ...data,
      filledQuantity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await OrderModel.create(order);
      } catch (e) {}
    }
    localOrders.unshift(order);
    return order;
  },

  async getOrders(userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await OrderModel.find({ userId }).sort({ createdAt: -1 });
      } catch (e) {}
    }
    return localOrders.filter((o) => o.userId === userId);
  },

  async updateOrderStatus(orderId: string, status: string, executedPrice?: number, rejectionReason?: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await OrderModel.findByIdAndUpdate(
          orderId,
          {
            $set: {
              status,
              executedPrice,
              rejectionReason,
              filledQuantity: status === 'EXECUTED' ? 1 : 0,
            },
          },
          { new: true }
        );
      } catch (e) {}
    }
    const order = localOrders.find((o) => o._id.toString() === orderId.toString());
    if (order) {
      order.status = status;
      if (executedPrice) {
        order.executedPrice = executedPrice;
        order.filledQuantity = order.quantity;
      }
      if (rejectionReason) order.rejectionReason = rejectionReason;
      order.updatedAt = new Date();
      return order;
    }
    return null;
  },

  async addTradeFill(data: any) {
    const id = generateId();
    const fill = {
      _id: id,
      ...data,
      timestamp: new Date(),
    };

    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await TradeFillModel.create(fill);
      } catch (e) {}
    }
    localFills.unshift(fill);
    return fill;
  },

  async getTradeFills(userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await TradeFillModel.find({ userId }).sort({ timestamp: -1 });
      } catch (e) {}
    }
    return localFills.filter((f) => f.userId === userId);
  },

  // Holdings & Positions
  async getHoldings(userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await HoldingModel.find({ userId });
      } catch (e) {}
    }
    return localHoldings.filter((h) => h.userId === userId);
  },

  async addHolding(data: any) {
    const existing = localHoldings.find(
      (h) => h.userId === data.userId && h.symbol === data.symbol && h.productType === (data.productType || 'CNC')
    );

    if (existing) {
      const newQty = existing.quantity + data.quantity;
      if (newQty <= 0) {
        // Closed position
        const idx = localHoldings.indexOf(existing);
        localHoldings.splice(idx, 1);
        return null;
      }
      const newTotalCost = existing.totalCost + data.totalCost;
      existing.quantity = newQty;
      existing.totalCost = newTotalCost;
      existing.averagePrice = newTotalCost / newQty;
      existing.updatedAt = new Date();
      return existing;
    }

    const id = generateId();
    const holding = {
      _id: id,
      ...data,
      productType: data.productType || 'CNC',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await HoldingModel.create(holding);
      } catch (e) {}
    }
    localHoldings.push(holding);
    return holding;
  },

  async updateHoldingOnSell(userId: string, symbol: string, sellQty: number, sellPrice: number, productType: string = 'CNC') {
    const holding = localHoldings.find(
      (h) => h.userId === userId && h.symbol === symbol && h.productType === productType
    );

    if (!holding) {
      throw new Error(`Holding not found for ${symbol}`);
    }

    if (sellQty > holding.quantity) {
      throw new Error(`Insufficient holding quantity (${holding.quantity}) to sell ${sellQty}`);
    }

    const costOfSoldShares = holding.averagePrice * sellQty;
    const sellProceeds = sellPrice * sellQty;
    const realizedPnL = sellProceeds - costOfSoldShares;

    holding.quantity -= sellQty;
    holding.totalCost -= costOfSoldShares;
    holding.realizedPnL = (holding.realizedPnL || 0) + realizedPnL;
    holding.updatedAt = new Date();

    if (holding.quantity === 0) {
      // Remove holding if empty
      const idx = localHoldings.indexOf(holding);
      localHoldings.splice(idx, 1);
    }

    return { holding, realizedPnL };
  },

  // AI Research & Predictions
  async saveAIResearch(data: any) {
    const id = generateId();
    const item = {
      _id: id,
      ...data,
      dataTimestamp: new Date(),
      createdAt: new Date(),
    };
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await AIResearchModel.create(item);
      } catch (e) {}
    }
    localResearch.unshift(item);
    return item;
  },

  async getAIResearch(userId: string, symbol?: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        const query: any = { userId };
        if (symbol) query.symbol = symbol.toUpperCase();
        return await AIResearchModel.find(query).sort({ dataTimestamp: -1 }).limit(10);
      } catch (e) {}
    }
    return localResearch
      .filter((r) => r.userId === userId && (!symbol || r.symbol === symbol.toUpperCase()))
      .slice(0, 10);
  },

  async savePrediction(data: any) {
    const id = generateId();
    const item = {
      _id: id,
      ...data,
      createdAt: new Date(),
    };
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await PredictionModel.create(item);
      } catch (e) {}
    }
    localPredictions.unshift(item);
    return item;
  },

  async getLatestPrediction(symbol: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await PredictionModel.findOne({ symbol: symbol.toUpperCase() }).sort({ createdAt: -1 });
      } catch (e) {}
    }
    return localPredictions.find((p) => p.symbol === symbol.toUpperCase()) || null;
  },

  // Trading Journal
  async getJournalEntries(userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await TradingJournalModel.find({ userId }).sort({ createdAt: -1 });
      } catch (e) {}
    }
    return localJournal.filter((j) => j.userId === userId);
  },

  async createJournalEntry(data: any) {
    const id = generateId();
    const item = {
      _id: id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await TradingJournalModel.create(item);
      } catch (e) {}
    }
    localJournal.unshift(item);
    return item;
  },

  // Notifications
  async getNotifications(userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(30);
      } catch (e) {}
    }
    return localNotifications.filter((n) => n.userId === userId).slice(0, 30);
  },

  async createNotification(data: any) {
    const id = generateId();
    const notif = {
      _id: id,
      ...data,
      read: false,
      createdAt: new Date(),
    };
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await NotificationModel.create(notif);
      } catch (e) {}
    }
    localNotifications.unshift(notif);
    return notif;
  },

  async markNotificationRead(notifId: string, userId: string) {
    if (dbState.type === 'MONGODB_ATLAS' && mongoose.connection.readyState === 1) {
      try {
        return await NotificationModel.findOneAndUpdate({ _id: notifId, userId }, { $set: { read: true } });
      } catch (e) {}
    }
    const notif = localNotifications.find((n) => n._id.toString() === notifId.toString() && n.userId === userId);
    if (notif) {
      notif.read = true;
      return notif;
    }
    return null;
  },
};
