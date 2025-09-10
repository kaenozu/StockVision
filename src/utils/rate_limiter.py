"""
Advanced rate limiter for Yahoo Finance API with intelligent throttling.
"""
import asyncio
import time
import logging
from typing import Dict, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class RateLimitStrategy(Enum):
    """Rate limiting strategies."""
    CONSERVATIVE = "conservative"  # 1 req/2sec
    NORMAL = "normal"             # 1 req/1sec  
    AGGRESSIVE = "aggressive"     # 2 req/1sec


@dataclass
class RateLimitConfig:
    """Rate limit configuration."""
    requests_per_minute: int
    backoff_factor: float = 2.0
    max_retries: int = 3
    cooldown_after_429: int = 3600  # 1 hour cooldown after 429


class IntelligentRateLimiter:
    """
    Intelligent rate limiter with adaptive throttling.
    
    Features:
    - Adaptive rate limiting based on response codes
    - Exponential backoff for 429 errors
    - Per-endpoint tracking
    - Automatic strategy adjustment
    """
    
    def __init__(self, strategy: RateLimitStrategy = RateLimitStrategy.NORMAL):
        self.strategy = strategy
        self._last_requests: Dict[str, float] = {}
        self._request_counts: Dict[str, int] = {}
        self._429_timestamps: Dict[str, float] = {}
        self._lock = asyncio.Lock()
        
        # Strategy configurations - Much more conservative for Yahoo Finance
        self._configs = {
            RateLimitStrategy.CONSERVATIVE: RateLimitConfig(6),    # 6/min = 1 req/10sec
            RateLimitStrategy.NORMAL: RateLimitConfig(12),         # 12/min = 1 req/5sec
            RateLimitStrategy.AGGRESSIVE: RateLimitConfig(30),     # 30/min = 1 req/2sec
        }
        
        self.config = self._configs[strategy]
        logger.info(f"Rate limiter initialized with {strategy.value} strategy")
    
    async def acquire(self, endpoint: str = "default") -> None:
        """
        Acquire permission to make a request.
        
        Args:
            endpoint: API endpoint identifier for per-endpoint limiting
        """
        async with self._lock:
            now = time.time()
            
            # Check if we're in cooldown after 429
            if endpoint in self._429_timestamps:
                cooldown_end = self._429_timestamps[endpoint] + self.config.cooldown_after_429
                if now < cooldown_end:
                    wait_time = cooldown_end - now
                    logger.warning(f"In cooldown for {endpoint}, waiting {wait_time:.1f}s")
                    await asyncio.sleep(wait_time)
                else:
                    # Cooldown expired, remove timestamp
                    del self._429_timestamps[endpoint]
            
            # Calculate time since last request
            if endpoint in self._last_requests:
                time_since_last = now - self._last_requests[endpoint]
                min_interval = 60.0 / self.config.requests_per_minute
                
                if time_since_last < min_interval:
                    sleep_time = min_interval - time_since_last
                    logger.debug(f"Rate limiting {endpoint}: sleeping {sleep_time:.2f}s")
                    await asyncio.sleep(sleep_time)
            
            # Update tracking
            self._last_requests[endpoint] = time.time()
            self._request_counts[endpoint] = self._request_counts.get(endpoint, 0) + 1
    
    def handle_response_code(self, endpoint: str, status_code: int) -> None:
        """
        Handle response and adjust rate limiting strategy.
        
        Args:
            endpoint: API endpoint
            status_code: HTTP response code
        """
        if status_code == 429:
            # Record 429 timestamp for cooldown
            self._429_timestamps[endpoint] = time.time()
            
            # Downgrade strategy if possible
            if self.strategy == RateLimitStrategy.AGGRESSIVE:
                self._downgrade_strategy(RateLimitStrategy.NORMAL)
            elif self.strategy == RateLimitStrategy.NORMAL:
                self._downgrade_strategy(RateLimitStrategy.CONSERVATIVE)
            
            logger.warning(f"429 error on {endpoint}, switched to {self.strategy.value} strategy")
        
        elif status_code == 200:
            # Success - we can potentially upgrade strategy after some time
            pass
    
    def _downgrade_strategy(self, new_strategy: RateLimitStrategy) -> None:
        """Downgrade to more conservative strategy."""
        self.strategy = new_strategy
        self.config = self._configs[new_strategy]
        logger.info(f"Downgraded to {new_strategy.value} strategy")
    
    async def retry_with_backoff(self, func, *args, max_retries: int = None, **kwargs):
        """
        Execute function with exponential backoff on failures.
        
        Args:
            func: Function to execute
            *args: Function arguments
            max_retries: Override default max retries
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
            
        Raises:
            Last exception if all retries failed
        """
        max_retries = max_retries or self.config.max_retries
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    # Exponential backoff
                    wait_time = (self.config.backoff_factor ** (attempt - 1))
                    logger.info(f"Retry {attempt}/{max_retries} after {wait_time:.1f}s")
                    await asyncio.sleep(wait_time)
                
                return await func(*args, **kwargs)
            
            except Exception as e:
                last_exception = e
                
                # Check if it's a rate limit error
                if "429" in str(e):
                    logger.warning(f"Rate limit hit on attempt {attempt + 1}")
                    continue
                
                # For other errors, don't retry unless it's a network error
                if "connection" in str(e).lower() or "timeout" in str(e).lower():
                    logger.warning(f"Network error on attempt {attempt + 1}: {e}")
                    continue
                
                # For other errors, fail immediately
                raise
        
        # All retries exhausted
        logger.error(f"All {max_retries} retries exhausted")
        raise last_exception
    
    def get_stats(self) -> Dict:
        """Get rate limiter statistics."""
        return {
            "strategy": self.strategy.value,
            "requests_per_minute": self.config.requests_per_minute,
            "total_requests": sum(self._request_counts.values()),
            "endpoints_in_cooldown": len(self._429_timestamps),
            "request_counts": dict(self._request_counts),
            "cooldown_timestamps": dict(self._429_timestamps),
        }
    
    def reset_cooldowns(self) -> None:
        """Reset all cooldown timestamps (for testing/manual recovery)."""
        self._429_timestamps.clear()
        logger.info("All rate limit cooldowns have been reset")
    
    def reset_endpoint_cooldown(self, endpoint: str) -> None:
        """Reset cooldown for a specific endpoint."""
        if endpoint in self._429_timestamps:
            del self._429_timestamps[endpoint]
            logger.info(f"Cooldown reset for endpoint: {endpoint}")


# Global rate limiter instance
_global_rate_limiter: Optional[IntelligentRateLimiter] = None


def get_rate_limiter() -> IntelligentRateLimiter:
    """Get global rate limiter instance."""
    global _global_rate_limiter
    if _global_rate_limiter is None:
        _global_rate_limiter = IntelligentRateLimiter(RateLimitStrategy.NORMAL)
    return _global_rate_limiter


def set_rate_limit_strategy(strategy: RateLimitStrategy) -> None:
    """Set global rate limiting strategy."""
    global _global_rate_limiter
    if _global_rate_limiter is None:
        _global_rate_limiter = IntelligentRateLimiter(strategy)
    else:
        _global_rate_limiter.strategy = strategy
        _global_rate_limiter.config = _global_rate_limiter._configs[strategy]
    logger.info(f"Global rate limit strategy set to {strategy.value}")


def reset_global_cooldowns() -> None:
    """Reset all cooldowns for global rate limiter."""
    global _global_rate_limiter
    if _global_rate_limiter is not None:
        _global_rate_limiter.reset_cooldowns()
    else:
        logger.info("No global rate limiter instance to reset")