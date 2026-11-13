from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# ==============================================================================
# Request Schemas
# ==============================================================================


class StockAnalysisRequest(BaseModel):
    symbol: str = Field(
        ..., min_length=1, max_length=20, description="NSE stock symbol"
    )
    exchange: str = Field(default="NSE", max_length=10)
    force_refresh: bool = Field(
        default=False, description="Bypass cache and force fresh AI generation"
    )


class PeerComparisonRequest(BaseModel):
    symbols: List[str] = Field(
        ...,
        min_length=2,
        max_length=5,
        description="List of 2 to 5 stock symbols to compare",
    )
    exchange: str = Field(default="NSE", max_length=10)
    force_refresh: bool = Field(
        default=False, description="Bypass cache and force fresh AI generation"
    )


class SentimentRequest(BaseModel):
    symbol: str = Field(
        ..., min_length=1, max_length=20, description="NSE stock symbol"
    )
    headline: Optional[str] = Field(
        default=None, max_length=500, description="Optional single headline to analyze"
    )
    force_refresh: bool = Field(
        default=False, description="Bypass cache and force fresh AI generation"
    )


class EducationRequest(BaseModel):
    topic: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Trading concept or technical indicator topic",
    )
    difficulty: Literal["beginner", "intermediate", "advanced"] = "beginner"


class QuizCompleteRequest(BaseModel):
    quizId: Optional[str] = None
    topic: str = Field(..., min_length=1, max_length=255)
    difficulty: str = "beginner"
    score: int = Field(..., ge=0)
    totalQuestions: int = Field(default=3, ge=1)



# ==============================================================================
# Structured Output Schemas (Validated from AI Providers)
# ==============================================================================


class FinancialPerformance(BaseModel):
    revenue: str
    profitability: str
    debt: str
    cashFlow: str


class StockAnalysisData(BaseModel):
    symbol: str
    companyName: str
    overview: str
    financialPerformance: FinancialPerformance
    strengths: List[str]
    risks: List[str]
    valuation: Optional[str] = None
    technicalSummary: Optional[str] = None
    conclusion: str
    limitations: List[str]
    verifiedMetrics: Dict[str, Any] = Field(default_factory=dict)


class PeerMetricRow(BaseModel):
    symbol: str
    companyName: str
    marketCap: Optional[str] = None
    pe: Optional[float] = None
    pb: Optional[float] = None
    debtToEquity: Optional[float] = None
    roe: Optional[str] = None
    profitMargin: Optional[str] = None
    strengths: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)


class PeerComparisonData(BaseModel):
    symbols: List[str]
    peers: List[PeerMetricRow]
    businessComparison: str
    financialPerformanceComparison: str
    valuationComparison: str
    relativeStrengths: List[str]
    relativeWeaknesses: List[str]
    keyDifferences: List[str]
    conclusion: str
    limitations: List[str]


class NewsSentimentItem(BaseModel):
    headline: str
    sentiment: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    score: float = Field(
        ..., ge=-1.0, le=1.0, description="Sentiment score from -1.0 to 1.0"
    )
    reasoning: str
    companyRelevance: str
    uncertainties: List[str] = Field(default_factory=list)
    publisher: Optional[str] = None
    publishedAt: Optional[str] = None


class SentimentData(BaseModel):
    symbol: str
    companyName: str
    overallSentiment: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    overallScore: float = Field(..., ge=-1.0, le=1.0)
    summary: str
    articles: List[NewsSentimentItem] = Field(default_factory=list)


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correctIndex: int
    explanation: str


class EducationData(BaseModel):
    topic: str
    difficulty: str
    title: str
    summary: str
    detailedExplanation: str
    keyTakeaways: List[str]
    realWorldExample: str
    riskManagementRule: str
    quizzes: List[QuizQuestion] = Field(default_factory=list)


# ==============================================================================
# API Response Wrappers
# ==============================================================================


class AIResponseMeta(BaseModel):
    cached: bool
    provider: str
    model: str
    generatedAt: str
    dataTimestamp: Optional[str] = None
    disclaimer: str = (
        "Generated for educational purposes only. Not SEBI-registered financial or investment advice. "
        "Factual figures reflect underlying market data at generation time."
    )


class AIStandardResponse(BaseModel):
    success: bool
    data: Any
    meta: AIResponseMeta


class AIUsageSummary(BaseModel):
    heavyRemaining: int
    heavyLimit: int
    lightRemaining: int
    lightLimit: int
    heavyUsedToday: int
    lightUsedToday: int
    resetInfo: str
