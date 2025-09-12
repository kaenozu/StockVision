"""
Yahoo Finance data provider.
"""

import asyncio
import logging
from typing import Optional

from ...config import get_yahoo_finance_config
from ...stock_api.data_models import CurrentPrice, PriceHistoryData, StockData
from ...stock_api.yahoo_client import (StockNotFoundError, YahooFinanceClient,
                                       YahooFinanceError)
from .base_provider import (BaseDataProvider, DataNotFoundError,
                            DataProviderError)

logger = logging.getLogger(__name__)


class YahooFinanceProvider(BaseDataProvider):
    """
    Yahoo Finance data provider for real stock market data.

    Integrates with Yahoo Finance API to fetch live stock data.
    """

    def __init__(self, **config):
        super().__init__("yahoo_finance", **config)
        self.yahoo_config = get_yahoo_finance_config()
        self._client: Optional[YahooFinanceClient] = None
        self._client_lock = asyncio.Lock()

    async def _get_client(self) -> YahooFinanceClient:
        """Get or create Yahoo Finance client."""
        async with self._client_lock:
            if self._client is None:
                self._client = YahooFinanceClient(
                    max_requests=self.yahoo_config.max_requests,
                    time_window=self.yahoo_config.time_window,
                    max_concurrent=self.yahoo_config.max_concurrent,
                    timeout=self.yahoo_config.timeout,
                    retry_attempts=self.yahoo_config.retry_attempts,
                    retry_delay=self.yahoo_config.retry_delay,
                )
            return self._client

    async def get_stock_info(self, stock_code: str) -> StockData:
        """Get stock information from Yahoo Finance."""
        try:
            client = await self._get_client()
            logger.info(f"Fetching real stock info for {stock_code} from Yahoo Finance")

            stock_data = await client.get_stock_info(stock_code)
            self._record_request(True)

            logger.info(f"Successfully retrieved real stock info for {stock_code}")
            return stock_data

        except StockNotFoundError as e:
            self._record_request(False)
            logger.warning(f"Stock not found: {stock_code}")
            raise DataNotFoundError(f"Stock {stock_code} not found") from e

        except YahooFinanceError as e:
            self._record_request(False)
            logger.error(f"Yahoo Finance API error for {stock_code}: {e}")
            raise DataProviderError(f"Yahoo Finance API error: {e}") from e

        except Exception as e:
            self._record_request(False)
            logger.error(f"Unexpected error getting stock info for {stock_code}: {e}")
            raise DataProviderError(f"Unexpected error: {e}") from e

    async def get_current_price(self, stock_code: str) -> CurrentPrice:
        """Get current price from Yahoo Finance."""
        try:
            client = await self._get_client()
            logger.info(
                f"Fetching real current price for {stock_code} from Yahoo Finance"
            )

            price_data = await client.get_current_price(stock_code)
            self._record_request(True)

            logger.info(f"Successfully retrieved real current price for {stock_code}")
            return price_data

        except StockNotFoundError as e:
            self._record_request(False)
            logger.warning(f"Stock not found: {stock_code}")
            raise DataNotFoundError(f"Stock {stock_code} not found") from e

        except YahooFinanceError as e:
            self._record_request(False)
            logger.error(f"Yahoo Finance API error for {stock_code}: {e}")
            raise DataProviderError(f"Yahoo Finance API error: {e}") from e

        except Exception as e:
            self._record_request(False)
            logger.error(
                f"Unexpected error getting current price for {stock_code}: {e}"
            )
            raise DataProviderError(f"Unexpected error: {e}") from e

    async def get_price_history(
        self, stock_code: str, days: int = 30
    ) -> PriceHistoryData:
        """Get price history from Yahoo Finance."""
        try:
            client = await self._get_client()
            logger.info(
                f"Fetching real price history for {stock_code} ({days} days) from Yahoo Finance"
            )

            history_data = await client.get_price_history(stock_code, days)
            self._record_request(True)

            logger.info(f"Successfully retrieved real price history for {stock_code}")
            return history_data

        except StockNotFoundError as e:
            self._record_request(False)
            logger.warning(f"Stock not found: {stock_code}")
            raise DataNotFoundError(f"Stock {stock_code} not found") from e

        except YahooFinanceError as e:
            self._record_request(False)
            logger.error(f"Yahoo Finance API error for {stock_code}: {e}")
            raise DataProviderError(f"Yahoo Finance API error: {e}") from e

        except Exception as e:
            self._record_request(False)
            logger.error(
                f"Unexpected error getting price history for {stock_code}: {e}"
            )
            raise DataProviderError(f"Unexpected error: {e}") from e

    async def is_available(self) -> bool:
        """Check if Yahoo Finance is available."""
        try:
            client = await self._get_client()
            # Try a simple request to test availability
            await client.get_current_price("7203")  # Toyota - should be available
            return True
        except Exception as e:
            logger.warning(f"Yahoo Finance provider not available: {e}")
            return False

    async def close(self) -> None:
        """Close Yahoo Finance client."""
        async with self._client_lock:
            if self._client:
                await self._client.close()
                self._client = None
                logger.info("Yahoo Finance client closed")
