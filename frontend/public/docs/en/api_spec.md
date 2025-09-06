# API Specification

This document explains the specifications for the StockVision API.

## Endpoints

### Stock Information

- `GET /api/stocks/{stock_code}`: Get stock information
- `GET /api/stocks/{stock_code}/current`: Get current stock price
- `GET /api/stocks/{stock_code}/history`: Get stock price history

### Watchlist

- `GET /api/watchlist`: Get watchlist
- `POST /api/watchlist`: Add to watchlist
- `DELETE /api/watchlist/{id}`: Remove from watchlist

## Authentication

The API does not require authentication, but some administrative endpoints require the `X-Admin-Token` header.

## Rate Limiting

The API has rate limits. See the [Performance](/docs/performance) documentation for details.