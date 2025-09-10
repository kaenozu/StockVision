"""
CSV Data Service
Google ColabからのCSVデータ取得とパースを行うサービス
"""

import pandas as pd
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from ..stock_api.data_models import StockData, PriceHistoryData, PriceHistoryItem
from ..models.stock import Stock
from ..models.price_history import PriceHistory
from sqlalchemy.orm import Session
from ..stock_storage.database import get_session_scope

logger = logging.getLogger(__name__)

class CSVDataService:
    """CSV経由でのデータ取得サービス"""
    
    def __init__(self):
        self.csv_sources = {
            'stock_data': 'data/stock_data.csv',
            'price_history': 'data/price_history.csv',
            'company_info': 'data/company_info.csv'
        }
    
    async def load_stock_data_from_csv(self, csv_path: str) -> List[StockData]:
        """CSVファイルから株式データを読み込み"""
        try:
            df = pd.read_csv(csv_path)
            stock_data_list = []
            
            # 銘柄ごとにグループ化
            for symbol, group in df.groupby('symbol'):
                latest_row = group.iloc[-1]  # 最新データ
                
                # StockDataオブジェクトを作成
                stock_data = StockData(
                    stock_code=symbol,
                    company_name=latest_row.get('company_name', 'Unknown'),
                    current_price=float(latest_row['close']),
                    previous_close=float(group.iloc[-2]['close'] if len(group) > 1 else latest_row['close']),
                    price_change=float(latest_row['close'] - (group.iloc[-2]['close'] if len(group) > 1 else latest_row['close'])),
                    price_change_pct=float(((latest_row['close'] - (group.iloc[-2]['close'] if len(group) > 1 else latest_row['close'])) / (group.iloc[-2]['close'] if len(group) > 1 else latest_row['close'])) * 100),
                    volume=int(latest_row.get('volume', 0)),
                    market_cap=latest_row.get('market_cap'),
                    last_updated=datetime.fromisoformat(latest_row.get('updated_at', datetime.now().isoformat()))
                )
                
                stock_data_list.append(stock_data)
            
            logger.info(f"Loaded {len(stock_data_list)} stocks from CSV")
            return stock_data_list
            
        except Exception as e:
            logger.error(f"Error loading CSV data: {e}")
            return []
    
    async def load_price_history_from_csv(self, csv_path: str, symbol: str = None) -> Dict[str, PriceHistoryData]:
        """CSVファイルから価格履歴データを読み込み"""
        try:
            df = pd.read_csv(csv_path)
            
            # 特定銘柄のみ取得
            if symbol:
                df = df[df['symbol'] == symbol]
            
            history_data = {}
            
            for stock_symbol, group in df.groupby('symbol'):
                history_items = []
                
                for _, row in group.iterrows():
                    item = PriceHistoryItem(
                        stock_code=stock_symbol,
                        date=datetime.strptime(row['date'], '%Y-%m-%d'),
                        open=float(row['open']),
                        high=float(row['high']),
                        low=float(row['low']),
                        close=float(row['close']),
                        volume=int(row['volume'])
                    )
                    history_items.append(item)
                
                history_data[stock_symbol] = PriceHistoryData(
                    stock_code=stock_symbol,
                    history=history_items,
                    period_days=len(history_items)
                )
            
            logger.info(f"Loaded price history for {len(history_data)} symbols")
            return history_data
            
        except Exception as e:
            logger.error(f"Error loading price history from CSV: {e}")
            return {}
    
    async def sync_csv_to_database(self, csv_path: str):
        """CSVデータをデータベースに同期"""
        try:
            stock_data_list = await self.load_stock_data_from_csv(csv_path)
            
            with get_session_scope() as db:
                for stock_data in stock_data_list:
                    # 既存レコードの確認
                    existing_stock = db.query(Stock).filter(Stock.stock_code == stock_data.stock_code).first()
                    
                    if existing_stock:
                        # 更新
                        existing_stock.current_price = stock_data.current_price
                        existing_stock.previous_close = stock_data.previous_close
                        existing_stock.price_change = stock_data.price_change
                        existing_stock.price_change_pct = stock_data.price_change_pct
                        existing_stock.volume = stock_data.volume
                        existing_stock.market_cap = stock_data.market_cap
                        existing_stock.updated_at = datetime.utcnow()
                    else:
                        # 新規作成
                        new_stock = Stock(
                            stock_code=stock_data.stock_code,
                            company_name=stock_data.company_name,
                            current_price=stock_data.current_price,
                            previous_close=stock_data.previous_close,
                            price_change=stock_data.price_change,
                            price_change_pct=stock_data.price_change_pct,
                            volume=stock_data.volume,
                            market_cap=stock_data.market_cap,
                            created_at=datetime.utcnow()
                        )
                        db.add(new_stock)
                
                db.commit()
                logger.info(f"Synced {len(stock_data_list)} stocks to database")
            
        except Exception as e:
            logger.error(f"Error syncing CSV to database: {e}")
    
    async def download_csv_from_colab(self, colab_url: str, local_path: str) -> bool:
        """Google Colabから生成されたCSVをダウンロード"""
        try:
            import requests
            
            # Google Drive URLをダイレクトダウンロード用に変換
            if "drive.google.com" in colab_url and "/file/d/" in colab_url:
                file_id = colab_url.split('/file/d/')[1].split('/')[0]
                download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
            else:
                download_url = colab_url
            
            response = requests.get(download_url)
            response.raise_for_status()
            
            with open(local_path, 'wb') as f:
                f.write(response.content)
            
            logger.info(f"Downloaded CSV from Colab to {local_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error downloading CSV from Colab: {e}")
            return False
    
    async def schedule_csv_update(self):
        """定期的なCSV更新スケジュール"""
        # Google Drive API経由でColab生成CSVを取得
        # または、Colab notebookを定期実行してCSVを更新
        pass

# Global service instance
csv_data_service = CSVDataService()