"""
Advanced Response Compression Middleware

Provides dynamic compression based on content type, size, and client support.
Supports Brotli, Gzip, and Deflate compression algorithms with configurable levels.
"""

import asyncio
import gzip
import logging
import zlib
from typing import Dict, Optional, Set, Tuple

import brotli
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, StreamingResponse
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class CompressionMiddleware(BaseHTTPMiddleware):
    """
    Advanced compression middleware with dynamic algorithm selection.

    Features:
    - Brotli, Gzip, and Deflate support
    - Content-type based compression rules
    - Size-based compression thresholds
    - Configurable compression levels
    - Quality-based algorithm selection
    """

    def __init__(
        self,
        app: ASGIApp,
        minimum_size: int = 500,
        maximum_size: int = 50 * 1024 * 1024,  # 50MB
        compressible_types: Optional[Set[str]] = None,
        compression_levels: Optional[Dict[str, int]] = None,
        exclude_paths: Optional[Set[str]] = None,
    ):
        super().__init__(app)
        self.minimum_size = minimum_size
        self.maximum_size = maximum_size

        # Default compressible content types
        self.compressible_types = compressible_types or {
            "application/json",
            "application/javascript",
            "application/xml",
            "text/css",
            "text/html",
            "text/javascript",
            "text/plain",
            "text/xml",
            "text/csv",
            "application/csv",
            "application/x-javascript",
            "application/xhtml+xml",
            "application/rss+xml",
            "application/atom+xml",
            "image/svg+xml",
            "application/vnd.api+json",
        }

        # Compression levels (1-11 for brotli, 1-9 for gzip/deflate)
        self.compression_levels = compression_levels or {
            "br": 6,  # Brotli - good balance of compression and speed
            "gzip": 6,  # Gzip - standard level
            "deflate": 6,  # Deflate - standard level
        }

        # Paths to exclude from compression
        self.exclude_paths = exclude_paths or {
            "/health",
            "/metrics",
            "/static/images",
            "/api/stream",
        }

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip compression for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)

        # Skip compression if client doesn't support it
        accept_encoding = request.headers.get("accept-encoding", "").lower()
        if not any(
            encoding in accept_encoding for encoding in ["br", "gzip", "deflate"]
        ):
            return await call_next(request)

        response = await call_next(request)

        # Skip compression for certain response types
        if self._should_skip_compression(response):
            return response

        # Get response body
        body = b""
        if hasattr(response, "body"):
            body = response.body
        elif isinstance(response, StreamingResponse):
            # Handle streaming responses
            chunks = []
            async for chunk in response.body_iterator:
                chunks.append(chunk)
            body = b"".join(chunks)

        # Check size constraints
        content_length = len(body)
        if content_length < self.minimum_size or content_length > self.maximum_size:
            return response

        # Check content type
        content_type = response.headers.get("content-type", "").split(";")[0].strip()
        if content_type not in self.compressible_types:
            return response

        # Select best compression algorithm
        algorithm = self._select_compression_algorithm(
            accept_encoding, content_type, content_length
        )
        if not algorithm:
            return response

        # Compress the content
        try:
            if hasattr(self, "_get_compression_level"):
                # SmartCompressionMiddleware - pass content_type
                compressed_body, encoding = await self._compress_content(
                    body, algorithm, content_type
                )
            else:
                # Base CompressionMiddleware
                compressed_body, encoding = await self._compress_content(
                    body, algorithm
                )

            # Only use compression if it reduces size significantly
            if len(compressed_body) >= content_length * 0.95:  # Less than 5% reduction
                return response

            # Create compressed response
            compressed_response = Response(
                content=compressed_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

            # Update headers
            compressed_response.headers["content-encoding"] = encoding
            compressed_response.headers["content-length"] = str(len(compressed_body))
            compressed_response.headers["vary"] = "Accept-Encoding"

            # Add compression info for monitoring
            compressed_response.headers["x-compression-ratio"] = (
                f"{len(compressed_body) / content_length:.3f}"
            )
            compressed_response.headers["x-compression-algorithm"] = algorithm

            logger.debug(
                f"Compressed response: {content_length} -> {len(compressed_body)} bytes "
                f"({len(compressed_body) / content_length * 100:.1f}%) using {algorithm}"
            )

            return compressed_response

        except Exception as e:
            logger.error(f"Compression failed: {e}")
            return response

    def _should_skip_compression(self, response: Response) -> bool:
        """Check if response should skip compression."""
        # Already compressed
        if "content-encoding" in response.headers:
            return True

        # Error responses
        if response.status_code >= 400:
            return True

        # No content
        if response.status_code == 204:
            return True

        # Range requests
        if "content-range" in response.headers:
            return True

        return False

    def _select_compression_algorithm(
        self, accept_encoding: str, content_type: str, content_length: int
    ) -> Optional[str]:
        """Select the best compression algorithm based on client support and content."""
        algorithms = []

        # Parse Accept-Encoding header with quality values
        encodings = self._parse_accept_encoding(accept_encoding)

        # Prioritize Brotli for text content (better compression ratio)
        if "br" in encodings and content_type.startswith(
            ("text/", "application/json", "application/javascript")
        ):
            algorithms.append(("br", encodings["br"]))

        # Add gzip and deflate
        if "gzip" in encodings:
            algorithms.append(("gzip", encodings["gzip"]))
        if "deflate" in encodings:
            algorithms.append(("deflate", encodings["deflate"]))

        # Add brotli for other content types
        if "br" in encodings and ("br", encodings["br"]) not in algorithms:
            algorithms.append(("br", encodings["br"]))

        # Sort by quality value
        algorithms.sort(key=lambda x: x[1], reverse=True)

        return algorithms[0][0] if algorithms else None

    def _parse_accept_encoding(self, accept_encoding: str) -> Dict[str, float]:
        """Parse Accept-Encoding header and return encodings with quality values."""
        encodings = {}

        for item in accept_encoding.split(","):
            item = item.strip()
            if ";q=" in item:
                encoding, quality = item.split(";q=", 1)
                encodings[encoding.strip()] = float(quality)
            else:
                encodings[item] = 1.0

        return encodings

    async def _compress_content(
        self, content: bytes, algorithm: str
    ) -> Tuple[bytes, str]:
        """Compress content using the specified algorithm."""
        if algorithm == "br":
            # Use asyncio for CPU-intensive operation
            compressed = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: brotli.compress(content, quality=self.compression_levels["br"]),
            )
            return compressed, "br"

        elif algorithm == "gzip":
            compressed = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: gzip.compress(
                    content, compresslevel=self.compression_levels["gzip"]
                ),
            )
            return compressed, "gzip"

        elif algorithm == "deflate":
            compressed = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: zlib.compress(
                    content, level=self.compression_levels["deflate"]
                ),
            )
            return compressed, "deflate"

        else:
            raise ValueError(f"Unsupported compression algorithm: {algorithm}")


class SmartCompressionMiddleware(CompressionMiddleware):
    """
    Smart compression middleware with adaptive compression levels.

    Adjusts compression levels based on:
    - Content size
    - Content type
    - Server load
    """

    def __init__(self, app: ASGIApp, **kwargs):
        super().__init__(app, **kwargs)

        # Adaptive compression levels based on content size
        self.size_based_levels = {
            "small": {"br": 8, "gzip": 7, "deflate": 7},  # < 10KB - higher compression
            "medium": {"br": 6, "gzip": 6, "deflate": 6},  # 10KB - 1MB - balanced
            "large": {"br": 4, "gzip": 4, "deflate": 4},  # > 1MB - faster compression
        }

    def _get_compression_level(
        self, algorithm: str, content_length: int, content_type: str
    ) -> int:
        """Get adaptive compression level based on content characteristics."""
        # Size-based levels
        if content_length < 10 * 1024:  # < 10KB
            level_config = self.size_based_levels["small"]
        elif content_length < 1024 * 1024:  # < 1MB
            level_config = self.size_based_levels["medium"]
        else:
            level_config = self.size_based_levels["large"]

        # Content-type adjustments
        if content_type in ["application/json", "text/plain"]:
            # JSON and text compress well, use higher levels
            base_level = level_config.get(algorithm, 6)
            return min(base_level + 1, 11 if algorithm == "br" else 9)

        return level_config.get(algorithm, 6)

    async def _compress_content(
        self, content: bytes, algorithm: str, content_type: str = ""
    ) -> Tuple[bytes, str]:
        """Compress content with adaptive compression levels."""
        level = self._get_compression_level(algorithm, len(content), content_type)

        if algorithm == "br":
            compressed = await asyncio.get_event_loop().run_in_executor(
                None, lambda: brotli.compress(content, quality=level)
            )
            return compressed, "br"

        elif algorithm == "gzip":
            compressed = await asyncio.get_event_loop().run_in_executor(
                None, lambda: gzip.compress(content, compresslevel=level)
            )
            return compressed, "gzip"

        elif algorithm == "deflate":
            compressed = await asyncio.get_event_loop().run_in_executor(
                None, lambda: zlib.compress(content, level=level)
            )
            return compressed, "deflate"

        else:
            raise ValueError(f"Unsupported compression algorithm: {algorithm}")
