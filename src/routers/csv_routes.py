"""
CSV Data Import Routes
Google ColabからのCSVデータ取得とインポート機能
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, UploadFile, File
from pydantic import BaseModel

from ..services.csv_data_service import csv_data_service
from ..database import get_db
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/csv", tags=["csv-import"])

class CSVImportResponse(BaseModel):
    success: bool
    message: str
    records_processed: Optional[int] = None
    errors: Optional[List[str]] = None

class CSVDownloadRequest(BaseModel):
    colab_url: str
    data_type: str  # 'stock_data', 'price_history', 'company_info'

@router.post("/upload", response_model=CSVImportResponse)
async def upload_csv(
    file: UploadFile = File(...),
    data_type: str = "stock_data",
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    CSVファイルをアップロードしてデータベースに取り込む
    """
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="CSVファイルのみ対応しています")
        
        # 一時ファイルとして保存
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            if data_type == "stock_data":
                # バックグラウンドでDB同期
                background_tasks.add_task(
                    csv_data_service.sync_csv_to_database,
                    tmp_file_path,
                    db
                )
                
                # レコード数をカウント
                import pandas as pd
                df = pd.read_csv(tmp_file_path)
                record_count = len(df.groupby('symbol'))
                
                return CSVImportResponse(
                    success=True,
                    message=f"{data_type}のインポートを開始しました",
                    records_processed=record_count
                )
            else:
                return CSVImportResponse(
                    success=False,
                    message=f"データタイプ '{data_type}' は未対応です"
                )
                
        finally:
            # 一時ファイルを削除
            os.unlink(tmp_file_path)
            
    except Exception as e:
        logger.error(f"CSV upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/download-from-colab", response_model=CSVImportResponse)
async def download_from_colab(
    request: CSVDownloadRequest,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Google ColabからCSVをダウンロードして取り込む
    """
    try:
        local_path = f"data/{request.data_type}.csv"
        
        # CSVダウンロード
        success = await csv_data_service.download_csv_from_colab(
            request.colab_url, 
            local_path
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="CSVダウンロードに失敗しました")
        
        # データベース同期をバックグラウンドで実行
        if request.data_type == "stock_data":
            background_tasks.add_task(
                csv_data_service.sync_csv_to_database,
                local_path,
                db
            )
        
        return CSVImportResponse(
            success=True,
            message=f"Colabから{request.data_type}をダウンロードしました"
        )
        
    except Exception as e:
        logger.error(f"Colab download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_csv_status():
    """
    CSV取り込み状況の確認
    """
    try:
        import os
        
        status = {}
        for data_type, file_path in csv_data_service.csv_sources.items():
            if os.path.exists(file_path):
                stat = os.stat(file_path)
                status[data_type] = {
                    "exists": True,
                    "size_mb": round(stat.st_size / 1024 / 1024, 2),
                    "modified": stat.st_mtime
                }
            else:
                status[data_type] = {"exists": False}
        
        return {
            "success": True,
            "csv_status": status
        }
        
    except Exception as e:
        logger.error(f"Status check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sample-data/{symbol}")
async def get_sample_csv_data(symbol: str):
    """
    CSV経由で取得したサンプルデータを表示
    """
    try:
        # CSVから特定銘柄のデータを取得
        history_data = await csv_data_service.load_price_history_from_csv(
            "data/stock_data.csv", 
            symbol
        )
        
        if symbol not in history_data:
            raise HTTPException(status_code=404, detail=f"銘柄 {symbol} のデータが見つかりません")
        
        data = history_data[symbol]
        
        return {
            "success": True,
            "symbol": symbol,
            "data_points": len(data.history),
            "date_range": {
                "start": data.history[0].date.isoformat() if data.history else None,
                "end": data.history[-1].date.isoformat() if data.history else None
            },
            "sample_data": [
                {
                    "date": item.date.isoformat(),
                    "close": item.close,
                    "volume": item.volume
                }
                for item in data.history[-5:]  # 直近5日分
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sample data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))