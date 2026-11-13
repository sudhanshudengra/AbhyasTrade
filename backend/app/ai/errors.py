class AIException(Exception):
    def __init__(
        self, message: str, code: str = "AI_GENERATION_FAILED", status_code: int = 500
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class AIAuthenticationRequiredError(AIException):
    def __init__(self, message: str = "Authentication required for AI analysis"):
        super().__init__(message, code="AI_AUTHENTICATION_REQUIRED", status_code=401)


class AIRequestInvalidError(AIException):
    def __init__(self, message: str):
        super().__init__(message, code="AI_REQUEST_INVALID", status_code=400)


class AIUsageLimitExceededError(AIException):
    def __init__(
        self,
        message: str = "Daily free AI analysis quota exceeded. Quota resets at midnight UTC.",
    ):
        super().__init__(message, code="AI_USAGE_LIMIT_EXCEEDED", status_code=429)


class AIProviderRateLimitedError(AIException):
    def __init__(
        self,
        message: str = "AI provider rate limit reached. Please retry in a few moments.",
    ):
        super().__init__(message, code="AI_PROVIDER_RATE_LIMITED", status_code=429)


class AIProviderUnavailableError(AIException):
    def __init__(
        self, message: str = "AI service temporarily unavailable. Please try again."
    ):
        super().__init__(message, code="AI_PROVIDER_UNAVAILABLE", status_code=503)


class AIResponseInvalidError(AIException):
    def __init__(
        self, message: str = "AI provider generated an invalid or incomplete response."
    ):
        super().__init__(message, code="AI_RESPONSE_INVALID", status_code=502)


class AICacheError(AIException):
    def __init__(self, message: str):
        super().__init__(message, code="AI_CACHE_ERROR", status_code=500)
