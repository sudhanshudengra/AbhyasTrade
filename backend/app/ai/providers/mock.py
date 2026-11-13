import logging
from typing import Any, Dict
from app.ai.providers.base import BaseAIProvider

logger = logging.getLogger("abhyastrade.ai.mock")


class MockProvider(BaseAIProvider):
    """
    Mock AI Provider used for unit testing, offline development, or when no external API key is provided.
    Generates realistic, schema-compliant responses without calling external network APIs.
    """

    @property
    def provider_name(self) -> str:
        return "mock"

    @property
    def model_name(self) -> str:
        return "mock-financial-v1"

    def is_configured(self) -> bool:
        return True

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        task_name: str,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        logger.info(f"MockProvider generating simulated output for task: {task_name}")

        if task_name == "stock-analysis":
            return {
                "symbol": "DEMO",
                "companyName": "Demo Corporation Ltd.",
                "overview": "A leading enterprise on the NSE with strong market presence across core operational segments.",
                "financialPerformance": {
                    "revenue": "Top-line revenue shows consistent annual expansion supported by steady domestic volume growth.",
                    "profitability": "Operating margins remain robust above industry medians, reflecting effective cost containment.",
                    "debt": "Conservative leverage profile with manageable debt servicing and healthy interest coverage.",
                    "cashFlow": "Positive operating cash flows reliably funding capital expenditure and working capital requirements.",
                },
                "strengths": [
                    "Dominant domestic market share in primary product lines",
                    "Strong brand equity and extensive pan-India distribution reach",
                    "Disciplined capital allocation with healthy returns on capital employed",
                    "Resilient cash balance providing liquidity cushion during macro volatility",
                ],
                "risks": [
                    "Exposure to raw material commodity price cycles",
                    "Increasing domestic and global competitive pressure",
                    "Potential macroeconomic deceleration impacting discretionary volume",
                ],
                "valuation": "Trading at standard industry valuation multiples relative to historical 5-year averages.",
                "technicalSummary": "RSI indicates neutral-to-constructive momentum above key 50-day moving average support.",
                "conclusion": "Represents an established corporate profile with sturdy balance sheet fundamentals suitable for learning core equity valuation concepts.",
                "limitations": [
                    "Analysis based on reported historical financials; does not account for unannounced regulatory changes",
                    "Market sentiment and intraday liquidity may deviate from fundamental valuation metrics",
                ],
            }

        elif task_name == "peer-comparison":
            return {
                "symbols": ["PEER1", "PEER2"],
                "peers": [
                    {
                        "symbol": "PEER1",
                        "companyName": "Peer One Ltd.",
                        "marketCap": "₹12,50,000 Cr",
                        "pe": 24.5,
                        "pb": 3.4,
                        "debtToEquity": 0.35,
                        "roe": "17.2%",
                        "profitMargin": "12.8%",
                        "strengths": [
                            "Market leader in retail scale",
                            "Lower cost of borrowing",
                        ],
                        "risks": ["Slower percentage growth due to large base"],
                    },
                    {
                        "symbol": "PEER2",
                        "companyName": "Peer Two Ltd.",
                        "marketCap": "₹6,80,000 Cr",
                        "pe": 29.1,
                        "pb": 4.1,
                        "debtToEquity": 0.12,
                        "roe": "21.0%",
                        "profitMargin": "15.4%",
                        "strengths": [
                            "Faster agile growth in high-margin segments",
                            "Virtually zero debt",
                        ],
                        "risks": [
                            "Higher valuation premium leaving lower margin of safety"
                        ],
                    },
                ],
                "businessComparison": "Peer One focuses on mass volume scale, whereas Peer Two specializes in premium high-margin niches.",
                "financialPerformanceComparison": "Peer Two displays higher return ratios (ROE) and profit margins, while Peer One generates larger absolute operating cash flows.",
                "valuationComparison": "Peer One trades at a lower P/E multiple offering relative value, while Peer Two commands a growth premium.",
                "relativeStrengths": [
                    "Peer One possesses superior supply-chain bargaining power",
                    "Peer Two demonstrates superior capital efficiency and returns on equity",
                ],
                "relativeWeaknesses": [
                    "Peer One carries slightly higher debt leverage",
                    "Peer Two is more susceptible to aggressive competitor discounting",
                ],
                "keyDifferences": [
                    "Scale vs Agility: Peer One relies on distribution breadth, Peer Two on operational speed",
                    "Balance Sheet: Peer Two operates nearly debt-free",
                ],
                "conclusion": "Learners should observe how market participants weigh scale versus profitability when pricing industry peers.",
                "limitations": [
                    "Differences in revenue accounting segments can slightly impact direct multiple comparability"
                ],
            }

        elif task_name == "sentiment":
            return {
                "symbol": "DEMO",
                "companyName": "Demo Corporation Ltd.",
                "overallSentiment": "POSITIVE",
                "overallScore": 0.65,
                "summary": "Recent corporate developments and positive quarterly operating trends indicate constructive sentiment across market news coverage.",
                "articles": [
                    {
                        "headline": "Demo Corp reports 14% growth in consolidated quarterly revenue; operating margins expand",
                        "sentiment": "POSITIVE",
                        "score": 0.75,
                        "reasoning": "Strong double-digit top-line growth and margin expansion represent positive financial performance.",
                        "companyRelevance": "Direct impact on earnings expectations and fundamental valuation.",
                        "uncertainties": [
                            "Forward guidance for subsequent quarters remains subject to broader demand conditions."
                        ],
                        "publisher": "Financial Daily",
                        "publishedAt": "2026-11-11T09:30:00Z",
                    }
                ],
            }

        elif task_name == "education":
            return {
                "topic": "Trading Fundamentals",
                "difficulty": "beginner",
                "title": "Mastering Risk Management and Trading Psychology",
                "summary": "The cornerstone of lasting trading success is preserving capital through strict position sizing and emotional detachment.",
                "detailedExplanation": "In financial markets, predicting individual price ticks is secondary to managing the risk per trade. Professional market participants structure every position so that no single adverse outcome can impair more than 1% to 2% of their total trading capital. By pre-determining the exit point before placing an order, a trader removes hesitation, fear, and greed from decision-making.",
                "keyTakeaways": [
                    "Never enter a trade without an objective Stop-Loss in place",
                    "Risk only a predetermined fraction (1-2%) of total virtual capital per idea",
                    "Aim for a minimum Risk-to-Reward ratio of 1:2 to ensure positive long-term expectancy",
                    "Embrace emotional detachment (Vairagya) from individual winning or losing trades",
                ],
                "realWorldExample": "If your virtual portfolio has ₹10,00,000, risking 1% means your maximum loss on a trade should be ₹10,000. If buying Reliance at ₹2,500 with a stop-loss at ₹2,450 (₹50 risk per share), your maximum position size is 200 shares.",
                "riskManagementRule": "The 1% Rule: Never let a single trade risk more than 1% of your total trading capital.",
                "quizzes": [
                    {
                        "question": "If your trading capital is ₹10,00,000, what is the maximum recommended risk on a single trade under the 1% rule?",
                        "options": ["₹1,000", "₹10,000", "₹50,000", "₹1,00,000"],
                        "correctIndex": 1,
                        "explanation": "1% of ₹10,00,000 is ₹10,000. Risking this amount protects your portfolio against adverse streaks.",
                    },
                    {
                        "question": "What is the primary purpose of a Stop-Loss order in trading?",
                        "options": [
                            "To guarantee a profit on every trade",
                            "To pre-define and automatically limit the maximum loss if price moves against you",
                            "To avoid paying exchange turnover charges",
                            "To execute orders without margin",
                        ],
                        "correctIndex": 1,
                        "explanation": "A stop-loss order enforces capital preservation by closing a position once an unfavorable price threshold is crossed.",
                    },
                ],
            }

        return {"message": "Simulated AI output", "task": task_name}
