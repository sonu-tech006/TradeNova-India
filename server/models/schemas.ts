import mongoose, { Schema, Document } from 'mongoose';

// User Schema
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  isVerified: boolean;
  role: 'user' | 'admin';
  preferences: {
    theme: 'dark' | 'light' | 'system';
    accentColor: string;
    defaultWatchlistId?: string;
    chartStyle: 'candlestick' | 'line';
  };
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String },
    isVerified: { type: Boolean, default: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    preferences: {
      theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
      accentColor: { type: String, default: '#10B981' },
      defaultWatchlistId: { type: String },
      chartStyle: { type: String, enum: ['candlestick', 'line'], default: 'candlestick' },
    },
  },
  { timestamps: true }
);

// Instrument Schema
export interface IInstrument extends Document {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  companyName: string;
  sector: string;
  industry: string;
  isin: string;
  basePrice: number;
  marketCapCr: number;
  marketCapCategory: 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP';
  peRatio: number;
  dividendYield: number;
  description: string;
  active: boolean;
  providerInstrumentId?: string;
  lotSize: number;
  tickSize: number;
}

export const InstrumentSchema = new Schema<IInstrument>(
  {
    symbol: { type: String, required: true, uppercase: true, index: true },
    exchange: { type: String, required: true, enum: ['NSE', 'BSE'], index: true },
    companyName: { type: String, required: true, index: true },
    sector: { type: String, required: true, index: true },
    industry: { type: String, required: true },
    isin: { type: String, required: true, unique: true },
    basePrice: { type: Number, required: true },
    marketCapCr: { type: Number, default: 0, index: true },
    marketCapCategory: { type: String, enum: ['LARGE_CAP', 'MID_CAP', 'SMALL_CAP'], default: 'MID_CAP', index: true },
    peRatio: { type: Number, default: 20, index: true },
    dividendYield: { type: Number, default: 1.0, index: true },
    description: { type: String },
    active: { type: Boolean, default: true, index: true },
    providerInstrumentId: { type: String },
    lotSize: { type: Number, default: 1 },
    tickSize: { type: Number, default: 0.05 },
  },
  { timestamps: true }
);
InstrumentSchema.index({ symbol: 1, exchange: 1 }, { unique: true });

// Watchlist Schema
export interface IWatchlist extends Document {
  userId: string;
  name: string;
  isDefault: boolean;
  symbols: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const WatchlistSchema = new Schema<IWatchlist>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    symbols: [{ type: String }],
  },
  { timestamps: true }
);

// PriceAlert Schema
export interface IPriceAlert extends Document {
  userId: string;
  symbol: string;
  exchange: string;
  condition: 'ABOVE' | 'BELOW' | 'PCT_CHANGE_UP' | 'PCT_CHANGE_DOWN';
  threshold: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'PAUSED' | 'EXPIRED';
  lastEvaluatedPrice?: number;
  triggeredAt?: Date;
  note?: string;
}

export const PriceAlertSchema = new Schema<IPriceAlert>(
  {
    userId: { type: String, required: true, index: true },
    symbol: { type: String, required: true, uppercase: true },
    exchange: { type: String, default: 'NSE' },
    condition: { type: String, required: true, enum: ['ABOVE', 'BELOW', 'PCT_CHANGE_UP', 'PCT_CHANGE_DOWN'] },
    threshold: { type: Number, required: true },
    status: { type: String, default: 'ACTIVE', enum: ['ACTIVE', 'TRIGGERED', 'PAUSED', 'EXPIRED'] },
    lastEvaluatedPrice: { type: Number },
    triggeredAt: { type: Date },
    note: { type: String },
  },
  { timestamps: true }
);

// PaperAccount Schema
export interface IPaperAccount extends Document {
  userId: string;
  initialCash: number;
  availableCash: number;
  reservedCash: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export const PaperAccountSchema = new Schema<IPaperAccount>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    initialCash: { type: Number, default: 1000000 },
    availableCash: { type: Number, default: 1000000 },
    reservedCash: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true }
);

// Order Schema
export interface IOrder extends Document {
  userId: string;
  paperAccountId: string;
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LIMIT';
  productType: 'CNC' | 'MIS'; // CNC = Delivery, MIS = Intraday
  quantity: number;
  filledQuantity: number;
  limitPrice?: number;
  triggerPrice?: number;
  executedPrice?: number;
  status: 'PENDING' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  idempotencyKey?: string;
  estimatedCharges: number;
  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: String, required: true, index: true },
    paperAccountId: { type: String, required: true },
    symbol: { type: String, required: true, uppercase: true },
    exchange: { type: String, default: 'NSE' },
    side: { type: String, required: true, enum: ['BUY', 'SELL'] },
    orderType: { type: String, required: true, enum: ['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LIMIT'] },
    productType: { type: String, default: 'CNC', enum: ['CNC', 'MIS'] },
    quantity: { type: Number, required: true, min: 1 },
    filledQuantity: { type: Number, default: 0 },
    limitPrice: { type: Number },
    triggerPrice: { type: Number },
    executedPrice: { type: Number },
    status: { type: String, default: 'PENDING', enum: ['PENDING', 'EXECUTED', 'REJECTED', 'CANCELLED'] },
    rejectionReason: { type: String },
    idempotencyKey: { type: String, index: true },
    estimatedCharges: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TradeFill Schema
export interface ITradeFill extends Document {
  orderId: string;
  userId: string;
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  fillPrice: number;
  charges: number;
  timestamp: Date;
}

export const TradeFillSchema = new Schema<ITradeFill>(
  {
    orderId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    symbol: { type: String, required: true, uppercase: true },
    exchange: { type: String, default: 'NSE' },
    side: { type: String, required: true, enum: ['BUY', 'SELL'] },
    quantity: { type: Number, required: true },
    fillPrice: { type: Number, required: true },
    charges: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Holding Schema
export interface IHolding extends Document {
  userId: string;
  symbol: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  realizedPnL: number;
  productType: 'CNC' | 'MIS';
  createdAt: Date;
  updatedAt: Date;
}

export const HoldingSchema = new Schema<IHolding>(
  {
    userId: { type: String, required: true, index: true },
    symbol: { type: String, required: true, uppercase: true },
    exchange: { type: String, default: 'NSE' },
    quantity: { type: Number, required: true },
    averagePrice: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    realizedPnL: { type: Number, default: 0 },
    productType: { type: String, default: 'CNC' },
  },
  { timestamps: true }
);
HoldingSchema.index({ userId: 1, symbol: 1, productType: 1 }, { unique: true });

// AI Research Record Schema
export interface IAIResearch extends Document {
  userId: string;
  symbol: string;
  companyName: string;
  overview: string;
  technicalInterpretation: string;
  scenarios: {
    bull: string;
    base: string;
    bear: string;
  };
  risksAndUncertainties: string[];
  keyFinancialsNote?: string;
  dataTimestamp: Date;
  dataSource: string;
  aiModel: string;
}

export const AIResearchSchema = new Schema<IAIResearch>(
  {
    userId: { type: String, required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, index: true },
    companyName: { type: String, required: true },
    overview: { type: String, required: true },
    technicalInterpretation: { type: String, required: true },
    scenarios: {
      bull: { type: String },
      base: { type: String },
      bear: { type: String },
    },
    risksAndUncertainties: [{ type: String }],
    keyFinancialsNote: { type: String },
    dataTimestamp: { type: Date, default: Date.now },
    dataSource: { type: String, default: 'TradeNova Market Feed' },
    aiModel: { type: String, default: 'gemini-3.8-flash' },
  },
  { timestamps: true }
);

// Prediction Schema
export interface IPrediction extends Document {
  symbol: string;
  exchange: string;
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
    rSquared: number;
    sampleSize: number;
  };
  limitations: string[];
  createdAt: Date;
}

export const PredictionSchema = new Schema<IPrediction>(
  {
    symbol: { type: String, required: true, uppercase: true, index: true },
    exchange: { type: String, default: 'NSE' },
    currentPrice: { type: Number, required: true },
    horizon: { type: String, required: true, enum: ['1_SESSION', '5_SESSIONS', '20_SESSIONS'] },
    forecastPrice: { type: Number, required: true },
    forecastLow: { type: Number, required: true },
    forecastHigh: { type: Number, required: true },
    expectedReturnPct: { type: Number, required: true },
    modelVersion: { type: String, default: 'TN-Quant-v2.4' },
    modelType: { type: String, default: 'Autoregressive Drift & Volatility Band' },
    dataWindowDays: { type: Number, default: 90 },
    validationMetrics: {
      mae: { type: Number, required: true },
      directionalAccuracyPct: { type: Number, required: true },
      rSquared: { type: Number, default: 0 },
      sampleSize: { type: Number, default: 120 },
    },
    limitations: [{ type: String }],
  },
  { timestamps: true }
);

// Trading Journal Schema
export interface ITradingJournal extends Document {
  userId: string;
  orderId?: string;
  symbol: string;
  thesis: string;
  strategyTags: string[];
  entryReason: string;
  exitReason?: string;
  lessonsLearned?: string;
  pnl?: number;
  pnlPct?: number;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export const TradingJournalSchema = new Schema<ITradingJournal>(
  {
    userId: { type: String, required: true, index: true },
    orderId: { type: String },
    symbol: { type: String, required: true, uppercase: true },
    thesis: { type: String, required: true },
    strategyTags: [{ type: String }],
    entryReason: { type: String, required: true },
    exitReason: { type: String },
    lessonsLearned: { type: String },
    pnl: { type: Number },
    pnlPct: { type: Number },
    rating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);

// Notification Schema
export interface INotification extends Document {
  userId: string;
  type: 'ORDER_FILL' | 'ORDER_REJECT' | 'PRICE_ALERT' | 'AI_REPORT' | 'SYSTEM';
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Deposit Transaction Schema (Card, UPI, Net Banking)
export interface IDepositTransaction extends Document {
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
  createdAt: Date;
}

export const DepositTransactionSchema = new Schema<IDepositTransaction>(
  {
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    paymentMethod: { type: String, required: true, enum: ['CARD', 'UPI', 'NET_BANKING'] },
    status: { type: String, default: 'SUCCESS', enum: ['SUCCESS', 'FAILED', 'PENDING'] },
    paymentReference: { type: String, required: true, unique: true },
    details: {
      cardLast4: { type: String },
      cardNetwork: { type: String },
      cardHolder: { type: String },
      upiId: { type: String },
      bankName: { type: String },
    },
  },
  { timestamps: true }
);

// Mongoose Models
export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const InstrumentModel = mongoose.models.Instrument || mongoose.model<IInstrument>('Instrument', InstrumentSchema);
export const WatchlistModel = mongoose.models.Watchlist || mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);
export const PriceAlertModel = mongoose.models.PriceAlert || mongoose.model<IPriceAlert>('PriceAlert', PriceAlertSchema);
export const PaperAccountModel = mongoose.models.PaperAccount || mongoose.model<IPaperAccount>('PaperAccount', PaperAccountSchema);
export const OrderModel = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
export const TradeFillModel = mongoose.models.TradeFill || mongoose.model<ITradeFill>('TradeFill', TradeFillSchema);
export const HoldingModel = mongoose.models.Holding || mongoose.model<IHolding>('Holding', HoldingSchema);
export const AIResearchModel = mongoose.models.AIResearch || mongoose.model<IAIResearch>('AIResearch', AIResearchSchema);
export const PredictionModel = mongoose.models.Prediction || mongoose.model<IPrediction>('Prediction', PredictionSchema);
export const TradingJournalModel = mongoose.models.TradingJournal || mongoose.model<ITradingJournal>('TradingJournal', TradingJournalSchema);
export const NotificationModel = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export const DepositTransactionModel = mongoose.models.DepositTransaction || mongoose.model<IDepositTransaction>('DepositTransaction', DepositTransactionSchema);
