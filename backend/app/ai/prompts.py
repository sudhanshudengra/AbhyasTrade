import json
from typing import Any, Dict, List


SYSTEM_FINANCIAL_ANALYST = """You are AbhyasTrade AI, a senior Indian equity research analyst and financial educator.
Your role is to help stock market learners and virtual traders understand company fundamentals, financial performance, and technical metrics on the National Stock Exchange (NSE) of India.

CRITICAL RULES:
1. Strict Factual Data Integrity: Do NOT invent, hallucinate, or alter any numerical figures, share prices, or financial ratios. All numbers MUST come exclusively from the supplied verified data. If a specific metric is missing or null, explicitly note that it is unavailable.
2. Beginner-Friendly Education: Explain what the metrics mean in simple, intuitive terms so virtual traders can learn how to evaluate stocks themselves.
3. No Guarantees or Direct Advice: Never provide guaranteed returns or direct buy/sell commands. Always phrase observations objectively as analysis and educational takeaways.
4. Output Format: You MUST output ONLY a valid, parseable JSON object matching the requested schema. Do NOT include markdown code fences (no ```json or ```) around the output. Output pure JSON only.
"""

SYSTEM_EDUCATOR = """You are AbhyasTrade AI Guru, a compassionate, disciplined trading educator inspired by the principles of continuous practice (अभ्यास) and emotional detachment (वैराग्य).
Your role is to explain trading concepts, technical indicators, risk management, and market psychology to virtual traders in an intuitive, engaging, and practical manner.

CRITICAL RULES:
1. Clarity & Depth: Provide actionable, beginner-friendly explanations with real-world trading examples.
2. Risk Management First: Emphasize position sizing, stop-loss discipline, and risk-to-reward ratio.
3. Interactive Learning: Include 2 to 3 multiple-choice quiz questions to test the learner's comprehension.
4. Output Format: You MUST output ONLY a valid, parseable JSON object matching the requested schema. No markdown code fences. Pure JSON only.
"""


def build_stock_analysis_prompt(
    symbol: str,
    company_name: str,
    sector: str,
    verified_metrics: Dict[str, Any],
    technical_indicators: Dict[str, Any],
) -> str:
    return f"""Analyze the following verified Indian equity data for {company_name} ({symbol}) on the NSE:

Verified Financial & Valuation Metrics:
{json.dumps(verified_metrics, indent=2)}

Verified Technical Indicators:
{json.dumps(technical_indicators, indent=2)}

Generate a complete, structured analysis. Required JSON Schema:
{{
  "symbol": "{symbol}",
  "companyName": "{company_name}",
  "overview": "Concise 2-3 sentence overview of business model, industry sector, and market position.",
  "financialPerformance": {{
    "revenue": "Explanation of revenue trajectory and top-line health using verified figures.",
    "profitability": "Explanation of profit margins, operating margins, and EPS.",
    "debt": "Assessment of debt-to-equity and balance sheet solvency.",
    "cashFlow": "Assessment of operational cash flow and liquidity strength."
  }},
  "strengths": [
    "3 to 4 key competitive advantages or fundamental strengths."
  ],
  "risks": [
    "3 to 4 key vulnerabilities, industry headwinds, or operational risks."
  ],
  "valuation": "Objective observation comparing P/E, P/B, and book value against reasonable industry norms.",
  "technicalSummary": "Educational reading of the RSI, moving averages (SMA), and price trend.",
  "conclusion": "A well-balanced, educational conclusion summarizing whether this company presents strong fundamentals, high volatility, or turnaround characteristics.",
  "limitations": [
    "2 to 3 data limitations (e.g. historical data latency, external regulatory changes, macroeconomic factors)."
  ]
}}
"""


def build_peer_comparison_prompt(
    symbols: List[str],
    peers_data: List[Dict[str, Any]],
) -> str:
    return f"""Compare the following {len(symbols)} NSE peer companies based on their verified data:

Verified Peer Data:
{json.dumps(peers_data, indent=2)}

Generate a comprehensive comparative analysis. Required JSON Schema:
{{
  "symbols": {json.dumps(symbols)},
  "peers": [
    {{
      "symbol": "SYMBOL",
      "companyName": "Company Name",
      "marketCap": "e.g. ₹15,40,000 Cr",
      "pe": 24.5,
      "pb": 3.2,
      "debtToEquity": 0.45,
      "roe": "18.5%",
      "profitMargin": "14.2%",
      "strengths": ["Key relative advantage"],
      "risks": ["Key relative concern"]
    }}
  ],
  "businessComparison": "Comparative overview of how each peer generates revenue and their distinct competitive moats.",
  "financialPerformanceComparison": "Comparative analysis of revenue growth, profit margins, and balance sheet strength.",
  "valuationComparison": "Comparative assessment of P/E and P/B multiples across the group.",
  "relativeStrengths": [
    "3 to 5 notable strengths across the different peers."
  ],
  "relativeWeaknesses": [
    "3 to 5 notable weaknesses across the different peers."
  ],
  "keyDifferences": [
    "3 to 4 distinct differentiators (e.g. debt load, segment focus, customer base)."
  ],
  "conclusion": "Educational synthesis explaining what type of investor or trading strategy might examine each peer.",
  "limitations": [
    "2 to 3 analytical caveats (e.g. accounting variances, cyclicality differences)."
  ]
}}
"""


def build_sentiment_prompt(
    symbol: str,
    company_name: str,
    news_items: List[Dict[str, Any]],
) -> str:
    return f"""Evaluate market news sentiment for {company_name} ({symbol}) on the NSE based on the following verified recent headlines:

Recent Headlines:
{json.dumps(news_items, indent=2)}

Generate an objective news sentiment report. Required JSON Schema:
{{
  "symbol": "{symbol}",
  "companyName": "{company_name}",
  "overallSentiment": "POSITIVE" or "NEGATIVE" or "NEUTRAL",
  "overallScore": 0.35, // float between -1.0 (extremely negative) and 1.0 (extremely positive)
  "summary": "1-2 sentence executive summary of current market news sentiment.",
  "articles": [
    {{
      "headline": "Full headline text",
      "sentiment": "POSITIVE" or "NEGATIVE" or "NEUTRAL",
      "score": 0.5, // float between -1.0 and 1.0
      "reasoning": "Clear explanation why this headline carries this sentiment.",
      "companyRelevance": "How directly this affects the company's revenue, operations, or stock price.",
      "uncertainties": ["Any ambiguity or lack of details in the headline."],
      "publisher": "Publisher Name",
      "publishedAt": "ISO date string"
    }}
  ]
}}
"""


def build_education_prompt(
    topic: str,
    difficulty: str,
) -> str:
    return f"""Explain the trading concept or technical indicator '{topic}' for a {difficulty} level learner on the AbhyasTrade virtual trading platform.

Required JSON Schema:
{{
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "title": "Engaging, clear title for the lesson",
  "summary": "A 2-sentence intuitive definition of what this concept is and why it matters.",
  "detailedExplanation": "A thorough, 3-4 paragraph beginner-friendly breakdown covering how the concept works, how it is calculated or plotted, and how traders use it.",
  "keyTakeaways": [
    "4 to 5 bullet points summarizing the core rules."
  ],
  "realWorldExample": "A realistic scenario on an Indian stock (e.g. Reliance, TCS, or Nifty 50) demonstrating how this concept plays out in practice.",
  "riskManagementRule": "The golden risk rule associated with this topic (e.g. never trade without a stop-loss, confirmation across timeframes).",
  "quizzes": [
    {{
      "question": "Realistic trading question based on this concept?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0, // 0 to 3
      "explanation": "Clear explanation of why this is the correct answer."
    }},
    {{
      "question": "Second testing question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 1,
      "explanation": "Explanation of correct answer."
    }}
  ]
}}
"""
