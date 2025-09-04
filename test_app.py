"""
Test FastAPI application with basic endpoints.
"""
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, Path
from pydantic import BaseModel, Field
import uvicorn


# Response Models
class StockResponse(BaseModel):
    """Stock response model for testing."""
    stock_code: str = Field(..., pattern=r"^[0-9]{4}$")
    company_name: str = Field(..., max_length=100)
    current_price: float = Field(..., ge=0)
    previous_close: float = Field(..., ge=0)
    price_change: float
    price_change_pct: float
    volume: int = Field(..., ge=0)
    market_cap: Optional[float] = Field(None, gt=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CurrentPriceResponse(BaseModel):
    """Current price response model."""
    stock_code: str = Field(..., pattern=r"^[0-9]{4}$")
    price: float = Field(..., ge=0)
    change: float
    change_pct: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PriceHistoryResponse(BaseModel):
    """Price history response model."""
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    open_price: float = Field(..., gt=0)
    high_price: float = Field(..., gt=0)
    low_price: float = Field(..., gt=0)
    close_price: float = Field(..., gt=0)
    volume: int = Field(..., ge=0)
    adj_close: Optional[float] = Field(None, gt=0)


class WatchlistResponse(BaseModel):
    """Watchlist response model."""
    id: int
    stock_code: str = Field(..., pattern=r"^[0-9]{4}$")
    added_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = Field(None, max_length=500)
    alert_price_high: Optional[float] = Field(None, gt=0)
    alert_price_low: Optional[float] = Field(None, gt=0)
    is_active: bool = True


class WatchlistCreateRequest(BaseModel):
    """Watchlist creation request model."""
    stock_code: str = Field(..., pattern=r"^[0-9]{4}$")
    notes: Optional[str] = Field(None, max_length=500)
    alert_price_high: Optional[float] = Field(None, gt=0)
    alert_price_low: Optional[float] = Field(None, gt=0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logging.info("Stock Test API started")
    yield
    logging.info("Stock Test API shutdown complete")


app = FastAPI(
    title="Stock Test API",
    version="1.0.0",
    description="株価テスト機能API仕様",
    servers=[{"url": "http://localhost:8000", "description": "Development server"}],
    lifespan=lifespan,
)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {"message": "Stock Test API is running", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


# Stock endpoints
@app.get("/stocks/{stock_code}", 
         response_model=StockResponse,
         summary="銘柄情報取得",
         tags=["Stocks"])
async def get_stock_info(stock_code: str = Path(..., pattern=r"^[0-9]{4}$")):
    """銘柄情報を取得します。"""
    
    # Mock data for testing
    if stock_code == "7203":  # Toyota
        return StockResponse(
            stock_code=stock_code,
            company_name="トヨタ自動車",
            current_price=2450.5,
            previous_close=2430.0,
            price_change=20.5,
            price_change_pct=0.84,
            volume=1234567,
            market_cap=29500000000000.0
        )
    else:
        raise HTTPException(status_code=404, detail=f"Stock code {stock_code} not found")


@app.get("/stocks/{stock_code}/current",
         response_model=CurrentPriceResponse,
         summary="リアルタイム価格取得",
         tags=["Stocks"])
async def get_current_price(stock_code: str = Path(..., pattern=r"^[0-9]{4}$")):
    """リアルタイム価格情報を取得します。"""
    
    if stock_code == "7203":
        return CurrentPriceResponse(
            stock_code=stock_code,
            price=2450.5,
            change=20.5,
            change_pct=0.84
        )
    else:
        raise HTTPException(status_code=404, detail=f"Stock code {stock_code} not found")


@app.get("/stocks/{stock_code}/history",
         response_model=List[PriceHistoryResponse],
         summary="価格履歴取得",
         tags=["Stocks"])
async def get_price_history(
    stock_code: str = Path(..., pattern=r"^[0-9]{4}$"),
    days: int = Query(default=30, ge=1, le=365)
):
    """価格履歴を取得します。"""
    
    if stock_code == "7203":
        # Return mock data for the last few days
        return [
            PriceHistoryResponse(
                date="2025-09-04",
                open_price=2430.0,
                high_price=2460.0,
                low_price=2420.0,
                close_price=2450.5,
                volume=1234567,
                adj_close=2450.5
            ),
            PriceHistoryResponse(
                date="2025-09-03",
                open_price=2400.0,
                high_price=2440.0,
                low_price=2390.0,
                close_price=2430.0,
                volume=1100000,
                adj_close=2430.0
            )
        ]
    else:
        raise HTTPException(status_code=404, detail=f"Stock code {stock_code} not found")


# Watchlist endpoints - mock storage
watchlist_storage = []
next_id = 1


@app.get("/watchlist",
         response_model=List[WatchlistResponse],
         summary="ウォッチリスト取得",
         tags=["Watchlist"])
async def get_watchlist(active: bool = Query(default=True)):
    """ウォッチリストを取得します。"""
    
    filtered_items = [
        item for item in watchlist_storage 
        if not active or item.is_active
    ]
    return filtered_items


@app.post("/watchlist",
          response_model=WatchlistResponse,
          status_code=201,
          summary="ウォッチリストに追加",
          tags=["Watchlist"])
async def add_to_watchlist(request: WatchlistCreateRequest):
    """ウォッチリストに銘柄を追加します。"""
    global next_id
    
    # Check for duplicates
    existing = next((item for item in watchlist_storage if item.stock_code == request.stock_code and item.is_active), None)
    if existing:
        raise HTTPException(status_code=409, detail=f"Stock code {request.stock_code} is already in the active watchlist")
    
    # Validate alert price relationship
    if (request.alert_price_high is not None and 
        request.alert_price_low is not None and
        request.alert_price_high <= request.alert_price_low):
        raise HTTPException(status_code=400, detail="Alert high price must be greater than alert low price")
    
    new_item = WatchlistResponse(
        id=next_id,
        stock_code=request.stock_code,
        notes=request.notes,
        alert_price_high=request.alert_price_high,
        alert_price_low=request.alert_price_low,
        is_active=True
    )
    
    watchlist_storage.append(new_item)
    next_id += 1
    
    return new_item


@app.delete("/watchlist/{id}",
            status_code=204,
            summary="ウォッチリストから削除",
            tags=["Watchlist"])
async def remove_from_watchlist(id: int = Path(...)):
    """ウォッチリストからアイテムを削除します。"""
    
    item_index = next((i for i, item in enumerate(watchlist_storage) if item.id == id), None)
    if item_index is None:
        raise HTTPException(status_code=404, detail=f"Watchlist item with ID {id} not found")
    
    watchlist_storage.pop(item_index)
    return None


if __name__ == "__main__":
    uvicorn.run(
        "test_app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )