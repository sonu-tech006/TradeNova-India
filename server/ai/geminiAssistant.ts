import { GoogleGenAI } from '@google/genai';
import { MarketQuote, Candle } from '../market-data/types.js';
import { TechnicalIndicators } from './quantEngine.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface AIResearchReport {
  symbol: string;
  companyName: string;
  dataTimestamp: string;
  dataSource: string;
  overview: string;
  movementAnalysis: string;
  technicalInterpretation: string;
  scenarios: {
    bull: string;
    base: string;
    bear: string;
  };
  risksAndUncertainties: string[];
  disclaimer: string;
}

export async function generateStockResearch(
  symbol: string,
  companyName: string,
  sector: string,
  quote: MarketQuote | null,
  technicals: TechnicalIndicators,
  recentCandles: Candle[]
): Promise<AIResearchReport> {
  const currentPrice = quote ? `₹${quote.price} (${quote.change >= 0 ? '+' : ''}${quote.changePercent}%)` : 'Data Unavailable';
  const rsi = technicals.rsi14 ? `${technicals.rsi14}` : 'N/A';
  const sma20 = technicals.sma20 ? `₹${technicals.sma20}` : 'N/A';
  const sma50 = technicals.sma50 ? `₹${technicals.sma50}` : 'N/A';
  const macd = technicals.macd.macdLine !== null ? `Line: ${technicals.macd.macdLine}, Hist: ${technicals.macd.histogram}` : 'N/A';

  const prompt = `You are TradeNova AI, an Indian equity research analyst. Analyze the following verified company and technical data:

Company: ${companyName} (${symbol})
Sector: ${sector}
Current Price: ${currentPrice}
RSI (14): ${rsi}
SMA 20: ${sma20} | SMA 50: ${sma50}
MACD: ${macd}
Data Provenance: ${quote?.dataSource || 'TradeNova Market Feed'}
Data Timestamp: ${quote?.lastUpdated || new Date().toISOString()}

Provide a structured financial research analysis in JSON format with exactly the following fields:
{
  "overview": "2-3 concise sentences on core business moats, products, and competitive positioning in the Indian market.",
  "movementAnalysis": "Concise factual interpretation of recent price trend in relation to sector tailwinds or benchmark movement.",
  "technicalInterpretation": "Interpretation of current RSI (${rsi}), Moving Averages (${sma20}/${sma50}), and momentum signals.",
  "bullScenario": "Realistic positive catalyst scenario and upside trajectory.",
  "baseScenario": "Realistic baseline consolidation or steady growth expectation.",
  "bearScenario": "Realistic downside scenario if macroeconomic or sector headwinds intensify.",
  "risksAndUncertainties": [
    "Key risk 1 (e.g. raw material, margin pressure, or regulatory change)",
    "Key risk 2 (e.g. interest rate sensitivity or competitive disruption)",
    "Key risk 3 (e.g. valuation multiple or global commodity cycle)"
  ]
}

Only return valid JSON without markdown fences. Keep analysis objective, realistic, and strictly grounded in the provided data.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    return {
      symbol: symbol.toUpperCase(),
      companyName,
      dataTimestamp: quote?.lastUpdated || new Date().toISOString(),
      dataSource: quote?.dataSource || 'TradeNova Market Feed',
      overview: parsed.overview || `${companyName} is a prominent player in the ${sector} sector in India.`,
      movementAnalysis: parsed.movementAnalysis || `Trading at ${currentPrice} reflecting ongoing sector and market conditions.`,
      technicalInterpretation: parsed.technicalInterpretation || `RSI is currently at ${rsi}. Watch the 20-day SMA at ${sma20} for immediate support.`,
      scenarios: {
        bull: parsed.bullScenario || 'Continued demand expansion and margin enhancement.',
        base: parsed.baseScenario || 'Steady operating performance in line with GDP and sector benchmarks.',
        bear: parsed.bearScenario || 'Input cost pressures or broader equity market corrections.',
      },
      risksAndUncertainties: parsed.risksAndUncertainties || [
        'Macroeconomic interest rate and inflation shifts.',
        'Sector-specific regulatory updates and competitive pressures.',
        'Market liquidity and broad index sentiment.',
      ],
      disclaimer: 'AI-generated research is experimental and educational only. It does not constitute investment advice or a buy/sell recommendation.',
    };
  } catch (err: any) {
    console.warn('[Gemini] Fallback research generated:', err.message);
    // Reliable fallback if API key quota exceeded or unavailable
    return {
      symbol: symbol.toUpperCase(),
      companyName,
      dataTimestamp: quote?.lastUpdated || new Date().toISOString(),
      dataSource: quote?.dataSource || 'TradeNova Market Feed',
      overview: `${companyName} is a leading Indian listed enterprise operating within the ${sector} sector with significant market presence and brand equity.`,
      movementAnalysis: `The stock is currently trading at ${currentPrice}, responding to prevailing liquidity and sector trends.`,
      technicalInterpretation: `RSI is measured at ${rsi}. Price is situated relative to 20-day SMA (${sma20}) and 50-day SMA (${sma50}).`,
      scenarios: {
        bull: 'Sustained institutional inflows and healthy quarterly earnings acceleration.',
        base: 'Rangebound accumulation within immediate support and resistance bands.',
        bear: 'Breach of key moving averages triggering profit booking.',
      },
      risksAndUncertainties: [
        'Shifts in broader Indian market valuations and FII/DII flow dynamics.',
        'Raw material price inflation and margin volatility.',
        'Sector-specific regulatory and competitive changes.',
      ],
      disclaimer: 'AI-generated research is experimental and educational only. It does not constitute investment advice or a buy/sell recommendation.',
    };
  }
}

export async function askStockAssistant(
  question: string,
  stockContext: {
    symbol: string;
    companyName: string;
    sector: string;
    quote: MarketQuote | null;
    technicals: TechnicalIndicators;
  }
): Promise<string> {
  const q = stockContext.quote;
  const t = stockContext.technicals;

  const prompt = `You are TradeNova AI, an intelligent fintech assistant embedded inside a professional Indian stock trading terminal.
Answer the user's inquiry concisely and professionally.

Stock Details:
- Company: ${stockContext.companyName} (${stockContext.symbol})
- Sector: ${stockContext.sector}
- Current Price: ₹${q?.price || 'N/A'} (Change: ${q?.change || 0} / ${q?.changePercent || 0}%)
- Day Range: High ₹${q?.high || 'N/A'} | Low ₹${q?.low || 'N/A'}
- RSI (14): ${t.rsi14 || 'N/A'}
- SMA 20: ₹${t.sma20 || 'N/A'} | SMA 50: ₹${t.sma50 || 'N/A'}
- MACD Histogram: ${t.macd.histogram || 'N/A'}
- Data Source: ${q?.dataSource || 'TradeNova'}
- Timestamp: ${q?.lastUpdated || new Date().toISOString()}

User Question: "${question}"

Guidelines:
- Answer in 2-4 direct, informative paragraphs.
- Reference the actual provided prices, RSI, and support/resistance levels.
- Always include a brief reminder that this analysis is for educational purposes, not financial advice.`;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.4,
      },
    });
    return res.text || 'Unable to analyze question at this moment.';
  } catch (e: any) {
    return `Analysis for ${stockContext.symbol}: The stock is trading at ₹${q?.price || 'N/A'} with RSI at ${t.rsi14 || 'neutral levels'}. For ${stockContext.companyName}, monitor key levels at ₹${t.sma20 || 'recent support'}. Please note this is simulated research and not certified investment advice.`;
  }
}
