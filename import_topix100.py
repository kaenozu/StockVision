#!/usr/bin/env python3
"""
TOPIX100 CSVデータのインポートスクリプト
"""

import sys

import pandas as pd
from sqlalchemy import text

from src.models.price_history import PriceHistory
from src.models.stock import Stock
from src.stock_storage.database import get_session_scope


def import_topix100_data(csv_path: str, clear_existing: bool = True):
    """
    TOPIX100 CSVデータをデータベースにインポート

    Args:
        csv_path: CSVファイルのパス
        clear_existing: 既存データをクリアするかどうか
    """
    print("=== TOPIX100データインポート開始 ===")
    print(f"ファイル: {csv_path}")
    print(f"既存データクリア: {'はい' if clear_existing else 'いいえ'}")

    try:
        # CSVファイル読み込み
        print("CSVファイル読み込み中...")
        df = pd.read_csv(csv_path)
        print(f"{len(df):,}件のレコードを読み込み")

        # データ確認
        unique_stocks = df["Stock_Code"].nunique()
        date_range = f"{df['Date'].min()} 〜 {df['Date'].max()}"
        print(f"銘柄数: {unique_stocks}")
        print(f"期間: {date_range}")

        with get_session_scope() as session:
            if clear_existing:
                print("既存データをクリア中...")
                # 外部キー制約を一時的に無効化
                session.execute(text("PRAGMA foreign_keys = OFF"))

                # 既存データを削除（順序重要：依存関係の逆順）
                from src.models.watchlist import Watchlist

                deleted_watchlists = session.query(Watchlist).delete()
                deleted_histories = session.query(PriceHistory).delete()
                deleted_stocks = session.query(Stock).delete()

                # 外部キー制約を再有効化
                session.execute(text("PRAGMA foreign_keys = ON"))
                session.commit()
                print(
                    f"削除完了: 銘柄 {deleted_stocks}件, 価格履歴 {deleted_histories}件, ウォッチリスト {deleted_watchlists}件"
                )

            # 銘柄データの挿入
            print("銘柄データ挿入中...")
            stock_summary = (
                df.groupby(["Stock_Code", "Company_Name"])
                .agg({"Close": ["last", "count"], "Date": "last", "Volume": "last"})
                .reset_index()
            )

            # フラット化
            stock_summary.columns = [
                "stock_code",
                "company_name",
                "current_price",
                "record_count",
                "last_date",
                "volume",
            ]

            # 価格変動計算（簡易版）
            stocks_to_insert = []
            for _, row in stock_summary.iterrows():
                stock_code = row["stock_code"]
                stock_data = df[df["Stock_Code"] == stock_code].sort_values("Date")

                if len(stock_data) >= 2:
                    current_price = stock_data.iloc[-1]["Close"]
                    previous_price = stock_data.iloc[-2]["Close"]
                    price_change = current_price - previous_price
                    price_change_pct = (price_change / previous_price) * 100
                else:
                    current_price = row["current_price"]
                    price_change = 0.0
                    price_change_pct = 0.0

                stock = Stock(
                    stock_code=str(stock_code),  # 文字列に変換
                    company_name=str(row["company_name"]),
                    current_price=float(current_price),
                    previous_close=float(previous_price),
                    price_change=float(price_change),
                    price_change_pct=float(price_change_pct),
                    volume=int(row["volume"]) if pd.notna(row["volume"]) else 0,
                    market_cap=None,  # 未対応
                )
                stocks_to_insert.append(stock)

            session.add_all(stocks_to_insert)
            session.commit()
            print(f"銘柄データ挿入完了: {len(stocks_to_insert)}件")

            # 価格履歴データの挿入
            print("価格履歴データ挿入中...")
            histories_to_insert = []

            for _, row in df.iterrows():
                history = PriceHistory(
                    stock_code=str(row["Stock_Code"]),  # 文字列に変換
                    date=pd.to_datetime(row["Date"]).date(),
                    open_price=float(row["Open"]),
                    high_price=float(row["High"]),
                    low_price=float(row["Low"]),
                    close_price=float(row["Close"]),
                    volume=int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
                )
                histories_to_insert.append(history)

                # バッチ挿入（メモリ節約）
                if len(histories_to_insert) >= 1000:
                    session.add_all(histories_to_insert)
                    session.commit()
                    print(f"  {len(histories_to_insert)}件を挿入...")
                    histories_to_insert.clear()

            # 残りのデータを挿入
            if histories_to_insert:
                session.add_all(histories_to_insert)
                session.commit()
                print(f"  残り{len(histories_to_insert)}件を挿入...")

            print("価格履歴データ挿入完了")

        # 最終確認
        with get_session_scope() as session:
            stock_count = session.query(Stock).count()
            history_count = session.query(PriceHistory).count()

            print("\n=== インポート完了！ ===")
            print(f"銘柄数: {stock_count}")
            print(f"価格履歴: {history_count:,}件")
            print("StockVision TOPIX100システム準備完了！")

    except Exception as e:
        print(f"エラーが発生しました: {e}")
        import traceback

        traceback.print_exc()
        return False

    return True


if __name__ == "__main__":
    csv_path = None

    if len(sys.argv) > 1:
        csv_path = sys.argv[1]

    success = import_topix100_data(csv_path, clear_existing=True)

    if success:
        print("\n=== 次のステップ ===")
        print("1. ブラウザで http://localhost:3000 を開く")
        print("2. 100+銘柄のおすすめシステムを確認")
        print("3. パフォーマンスの向上を体感")
        print("4. 新しい銘柄での投資判断をお楽しみください！")
    else:
        print("\nインポートが失敗しました")
        sys.exit(1)
