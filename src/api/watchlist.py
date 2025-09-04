"""
Watchlist API endpoints.

This module provides FastAPI endpoints for watchlist operations:
- GET /watchlist - ウォッチリスト取得
- POST /watchlist - ウォッチリストに追加  
- DELETE /watchlist/{id} - ウォッチリストから削除
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..stock_storage.database import get_session_scope
from ..models.watchlist import Watchlist
from ..models.stock import Stock

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


# Response Models
class WatchlistResponse(BaseModel):
    """Watchlist response model."""
    
    id: int = Field(..., description="ウォッチリストID")
    stock_code: str = Field(..., description="銘柄コード")
    added_at: datetime = Field(..., description="追加日時")
    notes: Optional[str] = Field(None, description="メモ")
    alert_price_high: Optional[Decimal] = Field(None, description="高値アラート価格")
    alert_price_low: Optional[Decimal] = Field(None, description="安値アラート価格")
    is_active: bool = Field(..., description="アクティブ状態")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v) if v is not None else None
        }


class WatchlistCreateRequest(BaseModel):
    """Watchlist creation request model."""
    
    stock_code: str = Field(..., pattern=r'^[0-9]{4}$', description="銘柄コード")
    notes: Optional[str] = Field(None, max_length=500, description="メモ")
    alert_price_high: Optional[Decimal] = Field(None, gt=0, description="高値アラート価格")
    alert_price_low: Optional[Decimal] = Field(None, gt=0, description="安値アラート価格")
    


def get_db():
    """Database session dependency."""
    with get_session_scope() as session:
        yield session


@router.get("/",
           summary="ウォッチリスト取得",
           response_model=List[WatchlistResponse],
           responses={
               200: {"description": "ウォッチリスト"}
           })
async def get_watchlist(
    active: bool = Query(default=True, description="アクティブなアイテムのみ取得"),
    db: Session = Depends(get_db)
):
    """ウォッチリストを取得します。
    
    Args:
        active: アクティブなアイテムのみ取得するかどうか
        db: データベースセッション
    
    Returns:
        List[WatchlistResponse]: ウォッチリストのリスト
    """
    logger.info(f"Fetching watchlist items (active={active})")
    
    try:
        query = db.query(Watchlist)
        
        if active:
            query = query.filter(Watchlist.is_active == True)
        
        watchlist_items = query.order_by(Watchlist.added_at.desc()).all()
        
        logger.info(f"Retrieved {len(watchlist_items)} watchlist items")
        
        return [
            WatchlistResponse(
                id=item.id,
                stock_code=item.stock_code,
                added_at=item.added_at,
                notes=item.notes,
                alert_price_high=item.alert_price_high,
                alert_price_low=item.alert_price_low,
                is_active=item.is_active
            )
            for item in watchlist_items
        ]
    
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching watchlist: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.error(f"Unexpected error fetching watchlist: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/",
            summary="ウォッチリストに追加",
            response_model=WatchlistResponse,
            status_code=201,
            responses={
                201: {"description": "追加成功"},
                400: {"description": "バリデーションエラー"},
                409: {"description": "既に存在する銘柄"}
            })
async def add_to_watchlist(
    request: WatchlistCreateRequest,
    db: Session = Depends(get_db)
):
    """ウォッチリストに銘柄を追加します。
    
    Args:
        request: ウォッチリスト追加リクエスト
        db: データベースセッション
    
    Returns:
        WatchlistResponse: 作成されたウォッチリストアイテム
    
    Raises:
        HTTPException: バリデーションエラーまたは重複エラー
    """
    logger.info(f"Adding stock {request.stock_code} to watchlist")
    
    try:
        # 銘柄の存在確認（まだ存在しない場合は後で作成される想定）
        # ここでは銘柄コードの形式バリデーションのみ実行
        
        # 既存のアクティブなウォッチリストアイテムをチェック
        existing_item = (
            db.query(Watchlist)
            .filter(
                Watchlist.stock_code == request.stock_code,
                Watchlist.is_active == True
            )
            .first()
        )
        
        if existing_item:
            logger.warning(f"Stock {request.stock_code} already exists in active watchlist")
            raise HTTPException(
                status_code=409,
                detail=f"Stock code {request.stock_code} is already in the active watchlist"
            )
        
        # 新しいウォッチリストアイテムを作成
        new_item = Watchlist(
            stock_code=request.stock_code,
            notes=request.notes,
            alert_price_high=request.alert_price_high,
            alert_price_low=request.alert_price_low,
            is_active=True,
            added_at=datetime.utcnow()
        )
        
        # アラート価格の関係性チェック
        if (new_item.alert_price_high is not None and 
            new_item.alert_price_low is not None and
            new_item.alert_price_high < new_item.alert_price_low):
            raise HTTPException(
                status_code=400,
                detail="Alert high price must be greater than or equal to alert low price"
            )
        
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        logger.info(f"Successfully added stock {request.stock_code} to watchlist with ID {new_item.id}")
        
        return WatchlistResponse(
            id=new_item.id,
            stock_code=new_item.stock_code,
            added_at=new_item.added_at,
            notes=new_item.notes,
            alert_price_high=new_item.alert_price_high,
            alert_price_low=new_item.alert_price_low,
            is_active=new_item.is_active
        )
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error adding to watchlist: {e}")
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except SQLAlchemyError as e:
        logger.error(f"Database error adding to watchlist: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.error(f"Unexpected error adding to watchlist: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{id}",
              summary="ウォッチリストから削除",
              status_code=204,
              responses={
                  204: {"description": "削除成功"},
                  404: {"description": "アイテムが見つからない"}
              })
async def remove_from_watchlist(
    id: int = Path(..., description="ウォッチリストアイテムID"),
    db: Session = Depends(get_db)
):
    """ウォッチリストからアイテムを削除します。
    
    Args:
        id: ウォッチリストアイテムID
        db: データベースセッション
    
    Raises:
        HTTPException: アイテムが見つからない場合は404
    """
    logger.info(f"Removing watchlist item with ID {id}")
    
    try:
        # ウォッチリストアイテムを検索
        watchlist_item = db.query(Watchlist).filter(Watchlist.id == id).first()
        
        if watchlist_item is None:
            logger.warning(f"Watchlist item with ID {id} not found")
            raise HTTPException(
                status_code=404,
                detail=f"Watchlist item with ID {id} not found"
            )
        
        # 論理削除ではなく物理削除を実行
        db.delete(watchlist_item)
        db.commit()
        
        logger.info(f"Successfully removed watchlist item with ID {id}")
        
        # 204 No Contentは何も返さない
        return None
    
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error removing watchlist item {id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.error(f"Unexpected error removing watchlist item {id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")