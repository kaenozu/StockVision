"""
Stock API endpoints with hybrid data source support.

This module provides FastAPI endpoints for stock-related operations:
- GET /stocks/{stock_code} - 銘柄情報取得
- GET /stocks/{stock_code}/current - リアルタイム価格取得  
- GET /stocks/{stock_code}/history - 価格履歴取得

Supports both mock data (fast) and real Yahoo Finance data via query parameters.
"""
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..stock_storage.database import get_session_scope
from ..stock_api.data_models import (
    StockData, CurrentPrice, CurrentPriceResponse, 
    StockCode, PriceHistoryRequest
)
from ..models.stock import Stock
from ..models.price_history import PriceHistory
from ..utils.cache import cache_stock_data, cache_current_price, cache_price_history
from ..services.stock_service import get_stock_service
from ..config import should_use_real_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stocks", tags=["Stocks"])

@router.get("/test")
async def test_endpoint():
    """テスト用エンドポイント"""
    return {"message": "API is working", "timestamp": "2025-09-09"}

@router.get("/history-test/{stock_code}")
async def get_price_history_test(stock_code: str):
    """新しい価格履歴テストエンドポイント"""
    return [
        {
            "stock_code": stock_code,
            "date": "2025-09-09",
            "open": 2500.0,
            "high": 2520.0,
            "low": 2485.0,
            "close": 2505.0,
            "volume": 1200000
        },
        {
            "stock_code": stock_code,
            "date": "2025-09-08",
            "open": 2495.0,
            "high": 2515.0,
            "low": 2480.0,
            "close": 2500.0,
            "volume": 1150000
        }
    ]


def get_db():
    """Database session dependency."""
    with get_session_scope() as session:
        yield session


@router.get("/{stock_code}", 
           summary="銘柄情報取得",
           response_model=StockData,
           responses={
               200: {
                   "description": "銘柄情報",
                   "content": {
                       "application/json": {
                           "example": {
                               "code": "7203",
                               "name": "トヨタ自動車",
                               "sector": "自動車",
                               "market_cap": 2500000000000,
                               "dividend_yield": 2.5,
                               "per": 15.2,
                               "pbr": 1.8,
                               "eps": 165.0,
                               "bps": 1350.0,
                               "last_updated": "2023-10-27T10:00:00Z"
                           }
                       }
                   }
               },
               404: {"description": "銘柄が見つからない"},
               400: {"description": "不正な銘柄コード"}
           })
@cache_stock_data(ttl=300.0)  # 5分間キャッシュ
async def get_stock_info(
    stock_code: str = Path(..., pattern=r"^[0-9]{4}$", example="7203"),
    use_real_data: Optional[bool] = Query(
        None, 
        description="Use real Yahoo Finance API (true) or mock data (false). Defaults to environment setting."
    ),
    db: Session = Depends(get_db)
):
    """銘柄情報を取得します。
    
    Args:
        stock_code: 4桁の銘柄コード (例: 7203)
        use_real_data: リアルAPIデータを使用するかどうか (None = 環境設定に従う)
        db: データベースセッション
    
    Returns:
        StockData: 銘柄の詳細情報 (リアルAPIまたはモックデータ)
    
    Raises:
        HTTPException: 銘柄が見つからない場合は404、その他エラーは500
    
    Note:
        use_real_data=true でリアルYahoo Finance API、false または未指定でモックデータを使用。
        環境変数 USE_REAL_YAHOO_API=true でデフォルト動作を変更可能。
    
    Examples:
        - リクエスト: `GET /stocks/7203`
        - リクエスト (リアルデータ): `GET /stocks/7203?use_real_data=true`
        - リクエスト (モックデータ): `GET /stocks/7203?use_real_data=false`
    """
    logger.info(f"Fetching stock info for {stock_code} (use_real_data={use_real_data})")
    
    try:
        # バリデーション
        stock_validator = StockCode(code=stock_code)
        
        # ハイブリッドサービスを使用
        stock_service = await get_stock_service()
        stock_data = await stock_service.get_stock_info(
            stock_code=stock_code,
            use_real_data=use_real_data,
            db=db
        )
        
        logger.info(f"Successfully retrieved stock info for {stock_code}")
        return stock_data
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error for stock {stock_code}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except SQLAlchemyError as e:
        logger.error(f"Database error for stock {stock_code}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.error(f"Unexpected error for stock {stock_code}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{stock_code}/current",
           summary="リアルタイム価格取得",
           response_model=CurrentPriceResponse,
           responses={
               200: {
                   "description": "現在価格情報",
                   "content": {
                       "application/json": {
                           "example": {
                               "code": "7203",
                               "name": "トヨタ自動車",
                               "price": 2500.5,
                               "change": 25.0,
                               "change_percent": 1.01,
                               "previous_close": 2475.5,
                               "open": 2490.0,
                               "high": 2510.0,
                               "low": 2485.0,
                               "volume": 1000000,
                               "timestamp": "2023-10-27T10:00:00Z"
                           }
                       }
                   }
               },
               404: {"description": "銘柄が見つからない"},
               400: {"description": "不正な銘柄コード"}
           })
@cache_current_price()  # 1分間キャッシュ
async def get_current_price(
    stock_code: str = Path(..., pattern=r"^[0-9]{4}$", example="7203"),
    use_real_data: Optional[bool] = Query(
        None, 
        description="Use real Yahoo Finance API (true) or mock data (false). Defaults to environment setting."
    ),
    db: Session = Depends(get_db)
):
    """リアルタイム価格情報を取得します。
    
    Args:
        stock_code: 4桁の銘柄コード
        use_real_data: リアルAPIデータを使用するかどうか (None = 環境設定に従う)
        db: データベースセッション
    
    Returns:
        CurrentPriceResponse: 現在価格情報 (リアルAPIまたはモックデータ)
    
    Note:
        use_real_data=true でリアルYahoo Finance API、false または未指定でモックデータを使用。
    
    Examples:
        - リクエスト: `GET /stocks/7203/current`
        - リクエスト (リアルデータ): `GET /stocks/7203/current?use_real_data=true`
        - リクエスト (モックデータ): `GET /stocks/7203/current?use_real_data=false`
    """
    logger.info(f"Fetching current price for {stock_code} (use_real_data={use_real_data})")
    
    try:
        # バリデーション
        stock_validator = StockCode(code=stock_code)
        
        # ハイブリッドサービスを使用
        stock_service = await get_stock_service()
        current_price = await stock_service.get_current_price(
            stock_code=stock_code,
            use_real_data=use_real_data
        )
        
        logger.info(f"Successfully retrieved current price for {stock_code}")
        return current_price.to_current_price_response()
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error for current price {stock_code}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except SQLAlchemyError as e:
        logger.error(f"Database error for current price {stock_code}: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.error(f"Unexpected error for current price {stock_code}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{stock_code}/history",
           summary="価格履歴取得",
           responses={
               200: {
                   "description": "価格履歴",
                   "content": {
                       "application/json": {
                           "example": [
                               {
                                   "date": "2023-10-27",
                                   "open": 2490.0,
                                   "high": 2510.0,
                                   "low": 2485.0,
                                   "close": 2500.5,
                                   "volume": 1000000
                               },
                               {
                                   "date": "2023-10-26",
                                   "open": 2480.0,
                                   "high": 2495.0,
                                   "low": 2470.0,
                                   "close": 2490.0,
                                   "volume": 950000
                               }
                           ]
                       }
                   }
               },
               404: {"description": "銘柄が見つからない"},
               400: {"description": "不正な銘柄コードまたは日数"}
           })
async def get_price_history(
    stock_code: str = Path(..., pattern=r"^[0-9]{4}$"),
    days: int = Query(default=30, ge=1, le=365, description="取得する日数"),
    use_real_data: Optional[bool] = Query(
        None, 
        description="Use real Yahoo Finance API (true) or mock data (false). Defaults to environment setting."
    ),
    db: Session = Depends(get_db)
):
    """価格履歴を取得します（実際のYahoo Finance APIを使用）。"""
    logger.info(f"Fetching price history for {stock_code}, days={days} (use_real_data={use_real_data})")
    
    try:
        # バリデーション
        stock_validator = StockCode(code=stock_code)
        
        # ハイブリッドサービスを使用
        stock_service = await get_stock_service()
        price_history_data = await stock_service.get_price_history(
            stock_code=stock_code,
            days=days,
            use_real_data=use_real_data,
            db=db
        )
        
        # レスポンス形式に変換
        history = []
        for item in price_history_data.history:
            history.append({
                "stock_code": item.stock_code,
                "date": item.date.strftime("%Y-%m-%d") if hasattr(item.date, 'strftime') else str(item.date),
                "open": float(item.open),
                "high": float(item.high),
                "low": float(item.low),
                "close": float(item.close),
                "volume": int(item.volume)
            })
        
        # 日付順でソート（古い順）
        history.sort(key=lambda x: x["date"])
        
        logger.info(f"Successfully retrieved {len(history)} price history records for {stock_code}")
        return history
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error for price history {stock_code}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        logger.error(f"Unexpected error for price history {stock_code}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")