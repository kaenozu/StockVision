"""
Phase 3: 高度な特徴量エンジニアリング
マーケット指標、マクロ経済データ、時系列特徴量の統合
"""
import numpy as np
import pandas as pd
import logging
import yfinance as yf
import requests
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class MarketRegime(Enum):
    """マーケットレジーム"""
    BULL_MARKET = "bull_market"
    BEAR_MARKET = "bear_market"
    SIDEWAYS = "sideways"
    HIGH_VOLATILITY = "high_volatility"
    LOW_VOLATILITY = "low_volatility"

@dataclass
class MarketContext:
    """マーケットコンテキスト情報"""
    nikkei225_change: float
    topix_change: float
    mothers_change: float
    usd_jpy_rate: float
    usd_jpy_change: float
    vix_level: float
    regime: MarketRegime
    sector_performance: Dict[str, float]

class AdvancedFeatureEngine:
    """Phase 3: 高度な特徴量エンジニアリング"""
    
    def __init__(self):
        self.market_indices_cache = {}
        self.macro_data_cache = {}
        self.sector_mapping = self._initialize_sector_mapping()
        
    def _initialize_sector_mapping(self) -> Dict[str, str]:
        """業界マッピングの初期化"""
        return {
            "7203": "自動車",  # トヨタ
            "6758": "電気機器",  # ソニー
            "9984": "情報・通信",  # ソフトバンク
            "8411": "銀行",  # みずほ
            "6501": "電気機器",  # 日立
            "9432": "情報・通信",  # NTT
            "6861": "電気機器",  # キーエンス
            "4063": "化学",  # 信越化学
            "6954": "電気機器",  # ファナック
            "7751": "精密機器"   # キヤノン
        }
    
    def get_market_context(self, date: datetime = None) -> MarketContext:
        """マーケットコンテキストを取得"""
        if date is None:
            date = datetime.now()
            
        try:
            # 主要指数データ取得
            nikkei_data = self._get_index_data("^N225", date)
            topix_data = self._get_index_data("^TOPX", date)
            mothers_data = self._get_index_data("MOTHERS.T", date)
            
            # 為替データ取得
            usdjpy_data = self._get_currency_data("USDJPY=X", date)
            
            # VIX取得
            vix_data = self._get_index_data("^VIX", date)
            
            # レジーム判定
            regime = self._detect_market_regime(nikkei_data, vix_data)
            
            # セクターパフォーマンス
            sector_perf = self._get_sector_performance(date)
            
            return MarketContext(
                nikkei225_change=nikkei_data.get('change_percent', 0.0),
                topix_change=topix_data.get('change_percent', 0.0),
                mothers_change=mothers_data.get('change_percent', 0.0),
                usd_jpy_rate=usdjpy_data.get('current', 150.0),
                usd_jpy_change=usdjpy_data.get('change_percent', 0.0),
                vix_level=vix_data.get('current', 20.0),
                regime=regime,
                sector_performance=sector_perf
            )
            
        except Exception as e:
            logger.warning(f"Failed to get market context: {e}")
            # デフォルト値を返す
            return MarketContext(
                nikkei225_change=0.0,
                topix_change=0.0,
                mothers_change=0.0,
                usd_jpy_rate=150.0,
                usd_jpy_change=0.0,
                vix_level=20.0,
                regime=MarketRegime.SIDEWAYS,
                sector_performance={}
            )
    
    def _get_index_data(self, symbol: str, date: datetime) -> Dict:
        """指数データを取得"""
        try:
            # yfinanceから取得
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d")
            
            if hist.empty:
                return {'current': 0.0, 'change_percent': 0.0}
            
            current = hist['Close'].iloc[-1]
            previous = hist['Close'].iloc[-2] if len(hist) > 1 else current
            change_percent = ((current - previous) / previous) * 100
            
            return {
                'current': float(current),
                'change_percent': float(change_percent)
            }
            
        except Exception as e:
            logger.warning(f"Failed to get data for {symbol}: {e}")
            return {'current': 0.0, 'change_percent': 0.0}
    
    def _get_currency_data(self, pair: str, date: datetime) -> Dict:
        """通貨ペアデータを取得"""
        try:
            ticker = yf.Ticker(pair)
            hist = ticker.history(period="5d")
            
            if hist.empty:
                return {'current': 150.0, 'change_percent': 0.0}
            
            current = hist['Close'].iloc[-1]
            previous = hist['Close'].iloc[-2] if len(hist) > 1 else current
            change_percent = ((current - previous) / previous) * 100
            
            return {
                'current': float(current),
                'change_percent': float(change_percent)
            }
            
        except Exception as e:
            logger.warning(f"Failed to get currency data for {pair}: {e}")
            return {'current': 150.0, 'change_percent': 0.0}
    
    def _detect_market_regime(self, nikkei_data: Dict, vix_data: Dict) -> MarketRegime:
        """マーケットレジーム判定"""
        nikkei_change = nikkei_data.get('change_percent', 0.0)
        vix_level = vix_data.get('current', 20.0)
        
        # ボラティリティベースの判定
        if vix_level > 30:
            return MarketRegime.HIGH_VOLATILITY
        elif vix_level < 15:
            return MarketRegime.LOW_VOLATILITY
        
        # トレンドベースの判定
        if nikkei_change > 1.5:
            return MarketRegime.BULL_MARKET
        elif nikkei_change < -1.5:
            return MarketRegime.BEAR_MARKET
        else:
            return MarketRegime.SIDEWAYS
    
    def _get_sector_performance(self, date: datetime) -> Dict[str, float]:
        """セクター別パフォーマンスを取得"""
        # 簡易版：主要セクターETFのパフォーマンス
        sector_etfs = {
            "自動車": "^TPNX",  # 日経自動車指数
            "電気機器": "^TPNEL",  # 日経電機指数
            "情報・通信": "^TPNET",  # 日経情報通信指数
            "銀行": "^TPNBK",  # 日経銀行指数
            "化学": "^TPNCH"  # 日経化学指数
        }
        
        sector_perf = {}
        for sector, symbol in sector_etfs.items():
            try:
                data = self._get_index_data(symbol, date)
                sector_perf[sector] = data.get('change_percent', 0.0)
            except:
                sector_perf[sector] = 0.0
        
        return sector_perf
    
    def create_market_features(self, df: pd.DataFrame, stock_code: str) -> pd.DataFrame:
        """マーケット特徴量を追加"""
        df = df.copy()
        
        logger.info(f"Creating market features for {stock_code}")
        
        # 各日付についてマーケットコンテキストを取得
        market_features = []
        
        for date in df.index:
            try:
                market_ctx = self.get_market_context(date)
                
                features = {
                    'nikkei225_change': market_ctx.nikkei225_change,
                    'topix_change': market_ctx.topix_change,
                    'mothers_change': market_ctx.mothers_change,
                    'usd_jpy_rate': market_ctx.usd_jpy_rate,
                    'usd_jpy_change': market_ctx.usd_jpy_change,
                    'vix_level': market_ctx.vix_level,
                    'regime_bull': 1 if market_ctx.regime == MarketRegime.BULL_MARKET else 0,
                    'regime_bear': 1 if market_ctx.regime == MarketRegime.BEAR_MARKET else 0,
                    'regime_sideways': 1 if market_ctx.regime == MarketRegime.SIDEWAYS else 0,
                    'regime_high_vol': 1 if market_ctx.regime == MarketRegime.HIGH_VOLATILITY else 0,
                    'regime_low_vol': 1 if market_ctx.regime == MarketRegime.LOW_VOLATILITY else 0,
                }
                
                # セクター特徴量
                stock_sector = self.sector_mapping.get(stock_code, "その他")
                sector_perf = market_ctx.sector_performance.get(stock_sector, 0.0)
                features['sector_performance'] = sector_perf
                
                market_features.append(features)
                
            except Exception as e:
                logger.warning(f"Failed to get market features for {date}: {e}")
                # デフォルト値
                features = {key: 0.0 for key in [
                    'nikkei225_change', 'topix_change', 'mothers_change',
                    'usd_jpy_rate', 'usd_jpy_change', 'vix_level',
                    'regime_bull', 'regime_bear', 'regime_sideways',
                    'regime_high_vol', 'regime_low_vol', 'sector_performance'
                ]}
                features['usd_jpy_rate'] = 150.0
                features['vix_level'] = 20.0
                market_features.append(features)
        
        # DataFrameに追加
        market_df = pd.DataFrame(market_features, index=df.index)
        df = pd.concat([df, market_df], axis=1)
        
        return df
    
    def create_seasonal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """季節性・周期性特徴量を追加"""
        df = df.copy()
        
        # 日付インデックスをdatetimeに変換
        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index)
        
        # 基本的な時間特徴量
        df['day_of_week'] = df.index.dayofweek
        df['month'] = df.index.month
        df['quarter'] = df.index.quarter
        df['year'] = df.index.year
        df['day_of_year'] = df.index.dayofyear
        df['week_of_year'] = df.index.isocalendar().week
        
        # 周期的エンコーディング（sin/cos）
        df['day_of_week_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_of_week_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        df['day_of_year_sin'] = np.sin(2 * np.pi * df['day_of_year'] / 365)
        df['day_of_year_cos'] = np.cos(2 * np.pi * df['day_of_year'] / 365)
        
        # 日本の祝日・イベント効果
        df['is_month_end'] = (df.index.day > 25).astype(int)
        df['is_month_start'] = (df.index.day <= 5).astype(int)
        df['is_quarter_end'] = ((df['month'].isin([3, 6, 9, 12])) & (df.index.day > 25)).astype(int)
        df['is_year_end'] = ((df['month'] == 12) & (df.index.day > 25)).astype(int)
        
        # 決算時期効果（日本企業は3月決算が多い）
        df['earnings_season'] = ((df['month'].isin([4, 5])) | (df['month'].isin([10, 11]))).astype(int)
        
        # 夏休み・年末年始効果
        df['summer_holiday'] = ((df['month'] == 8) | ((df['month'] == 7) & (df.index.day > 15))).astype(int)
        df['year_end_holiday'] = ((df['month'] == 12) & (df.index.day > 28)).astype(int)
        df['golden_week'] = ((df['month'] == 5) & (df.index.day <= 7)).astype(int)
        
        return df
    
    def create_macroeconomic_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """マクロ経済特徴量を追加"""
        df = df.copy()
        
        import os
        from fredapi import Fred
        
        api_key = os.environ.get("FRED_API_KEY")
        
        if not api_key:
            logger.warning("FRED_API_KEY not found in environment variables. Skipping macroeconomic features.")
            # Add placeholder columns to maintain consistent feature set
            df['jp_interest_rate'] = 0.0
            df['us_interest_rate'] = 0.0
            return df

        try:
            fred = Fred(api_key=api_key)
            
            start_date = df.index.min()
            end_date = df.index.max()
            
            # Fetch data
            jp_rate_series = fred.get_series('IRLTLT01JPM156N', start_date, end_date)
            us_rate_series = fred.get_series('DGS10', start_date, end_date)
            
            # Rename and join
            jp_rate_df = jp_rate_series.to_frame(name='jp_interest_rate')
            us_rate_df = us_rate_series.to_frame(name='us_interest_rate')
            
            df = df.join(jp_rate_df, how='left')
            df = df.join(us_rate_df, how='left')
            
            # Forward-fill missing values (as macro data is not daily)
            df['jp_interest_rate'] = df['jp_interest_rate'].ffill()
            df['us_interest_rate'] = df['us_interest_rate'].ffill()

            # Backward-fill any remaining NaNs at the beginning
            df['jp_interest_rate'] = df['jp_interest_rate'].bfill()
            df['us_interest_rate'] = df['us_interest_rate'].bfill()

            # If still NaN, fill with 0
            df['jp_interest_rate'] = df['jp_interest_rate'].fillna(0)
            df['us_interest_rate'] = df['us_interest_rate'].fillna(0)

            logger.info("Successfully added macroeconomic features.")

        except Exception as e:
            logger.error(f"Failed to fetch or process macroeconomic data: {e}")
            # Add placeholder columns on failure
            df['jp_interest_rate'] = 0.0
            df['us_interest_rate'] = 0.0

        return df
    
    def create_cross_asset_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """クロスアセット特徴量を追加"""
        df = df.copy()
        
        logger.info("Creating cross-asset features")
        
        cross_asset_tickers = {
            "jgb_10y": "1326.T",  # iShares Core Japan Govt Bond ETF
            "commodities": "GSG",   # iShares S&P GSCI Commodity-Indexed Trust
            "reit_jp": "^TREIT",  # Tokyo Stock Exchange REIT Index
            "hang_seng": "^HSI",    # Hang Seng Index
            "shanghai": "000001.SS",# Shanghai Composite Index
            "sp500": "^GSPC"      # S&P 500
        }

        # Ensure the DataFrame index is timezone-aware or convert it
        if df.index.tz is None:
            df.index = df.index.tz_localize('Asia/Tokyo')

        start_date = df.index.min() - timedelta(days=1)
        end_date = df.index.max() + timedelta(days=1)

        stock_returns = df['Close'].pct_change()

        for name, ticker in cross_asset_tickers.items():
            try:
                asset_data = yf.download(ticker, start=start_date, end=end_date, progress=False)
                if not asset_data.empty:
                    asset_returns = asset_data['Close'].pct_change()
                    
                    # Align indices
                    aligned_stock, aligned_asset = stock_returns.align(asset_returns, join='inner')
                    
                    if len(aligned_stock) > 1:
                        correlation = aligned_stock.corr(aligned_asset)
                        df[f'{name}_correlation'] = correlation
                    else:
                        df[f'{name}_correlation'] = 0.0

                else:
                    df[f'{name}_correlation'] = 0.0
            except Exception as e:
                logger.warning(f"Failed to fetch or process data for {ticker}: {e}")
                df[f'{name}_correlation'] = 0.0
        
        return df
    
    def create_sentiment_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """センチメント特徴量を追加"""
        df = df.copy()
        
        logger.info("Creating sentiment features")
        
        # VIXを恐怖・貪欲指数の代理変数として使用
        if 'vix_level' in df.columns:
            # VIXレベルを0-100のスケールに正規化（簡易版）
            # 10以下を「極端な貪欲」、50以上を「極端な恐怖」と仮定
            vix_scaled = (df['vix_level'] - 10) / (50 - 10) * 100
            df['fear_greed_index_vix_proxy'] = 100 - np.clip(vix_scaled, 0, 100)
        else:
            df['fear_greed_index_vix_proxy'] = 50.0  # VIXが利用できない場合は中立値

        # --- 以下のセンチメント指標は現在プレースホルダーです ---
        # 将来的に実際のデータソース（例：ニュースセンチメントAPI）との連携が必要です

        # プット・コール・レシオ
        df['put_call_ratio'] = 1.0  # 中立値 (プレースホルダー)
        
        # 投資家心理指標
        df['investor_sentiment'] = 0.0  # 中立値 (プレースホルダー)
        
        # ニュースセンチメント（将来的にはNLP分析結果）
        df['news_sentiment'] = 0.0  # 中立値 (プレースホルダー)
        
        # ソーシャルメディアセンチメント
        df['social_sentiment'] = 0.0  # 中立値 (プレースホルダー)
        
        return df
    
    def create_all_advanced_features(self, df: pd.DataFrame, stock_code: str) -> pd.DataFrame:
        """全ての高度な特徴量を統合"""
        logger.info(f"Creating all advanced features for {stock_code}")
        
        # 各特徴量グループを順次追加
        df = self.create_market_features(df, stock_code)
        df = self.create_seasonal_features(df)
        df = self.create_macroeconomic_features(df)
        df = self.create_cross_asset_features(df)
        df = self.create_sentiment_features(df)
        
        # 技術的特徴量も追加
        df = self.create_technical_features(df)
        
        logger.info(f"Created {df.shape[1]} total features for {stock_code}")
        
        return df
    
    def create_technical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """技術的特徴量を追加（基本的なもの）"""
        df = df.copy()
        
        # 価格データが存在することを確認
        if 'Close' not in df.columns:
            return df
        
        # 移動平均
        for period in [5, 10, 20, 50]:
            df[f'sma_{period}'] = df['Close'].rolling(window=period).mean()
            df[f'ema_{period}'] = df['Close'].ewm(span=period).mean()
        
        # ボリンジャーバンド
        bb_period = 20
        bb_std = df['Close'].rolling(window=bb_period).std()
        df['bb_upper'] = df[f'sma_{bb_period}'] + (bb_std * 2)
        df['bb_lower'] = df[f'sma_{bb_period}'] - (bb_std * 2)
        df['bb_ratio'] = (df['Close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # RSI
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # MACD
        ema_12 = df['Close'].ewm(span=12).mean()
        ema_26 = df['Close'].ewm(span=26).mean()
        df['macd'] = ema_12 - ema_26
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']
        
        # 価格変動率
        for period in [1, 5, 10, 20]:
            df[f'returns_{period}d'] = df['Close'].pct_change(periods=period)
        
        # ボリューム特徴量（ボリュームデータがある場合）
        if 'Volume' in df.columns:
            df['volume_sma'] = df['Volume'].rolling(window=20).mean()
            df['volume_ratio'] = df['Volume'] / df['volume_sma']
        
        return df


# グローバルインスタンス
advanced_feature_engine = AdvancedFeatureEngine()