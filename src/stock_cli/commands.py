"""
株価トラッキングアプリケーションのCLIコマンド。

Click フレームワークを使用して、株価情報の取得、ウォッチリスト管理、
価格履歴表示などの機能を提供します。
"""
import asyncio
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple

import click
from rich.console import Console

from ..stock_api.yahoo_client import YahooFinanceClient, YahooFinanceError
from ..stock_storage.storage_service import StockStorageService, StorageError, StockNotFoundError
from ..stock_display.renderers import StockRenderer, WatchlistRenderer, PriceHistoryRenderer, ProgressRenderer, InteractiveRenderer
from ..stock_api.data_models import CurrentPrice


console = Console()


# Click グループとオプションの設定
@click.group()
@click.version_option(version='1.0.0', message='株価トラッキングCLI v%(version)s')
@click.option('--format', 'output_format', default='table', 
              type=click.Choice(['json', 'table', 'compact'], case_sensitive=False),
              help='出力形式を指定 (json/table/compact)')
@click.pass_context
def cli(ctx, output_format):
    """株価トラッキングCLI - 株価情報の取得とウォッチリスト管理。
    
    使用例:
      python -m src.stock_cli search 7203
      python -m src.stock_cli watchlist add 7203 --notes "トヨタ"
      python -m src.stock_cli history 7203 --days 30
    """
    ctx.ensure_object(dict)
    ctx.obj['format'] = output_format


# 株価検索コマンド
@cli.command()
@click.argument('stock_code', type=str)
@click.option('--save', is_flag=True, help='データベースに保存する')
@click.pass_context
def search(ctx, stock_code: str, save: bool):
    """株価情報を検索・表示。
    
    STOCK_CODE: 4桁の銘柄コード (例: 7203)
    """
    try:
        # 銘柄コードの検証
        if not stock_code.isdigit() or len(stock_code) != 4:
            raise click.BadParameter('銘柄コードは4桁の数字である必要があります')
        
        output_format = ctx.obj['format']
        renderer = StockRenderer(console=console, format_type=output_format)
        
        async def fetch_and_display():
            try:
                # Yahoo Finance APIから株価データを取得
                async with YahooFinanceClient() as client:
                    stock_data = await client.get_stock_info(stock_code)
                
                if save:
                    # データベースに保存
                    storage = StockStorageService()
                    try:
                        # 既存データがあるかチェック
                        existing_stock = storage.get_stock(stock_code)
                        # 更新
                        storage.update_stock(
                            stock_code=stock_code,
                            current_price=stock_data.current_price,
                            previous_close=stock_data.previous_close,
                            volume=stock_data.volume,
                            market_cap=stock_data.market_cap,
                            company_name=stock_data.company_name
                        )
                        renderer.render_success(f"株価データを更新しました: {stock_code}")
                    except StockNotFoundError:
                        # 新規作成
                        storage.create_stock(
                            stock_code=stock_code,
                            company_name=stock_data.company_name,
                            current_price=stock_data.current_price,
                            previous_close=stock_data.previous_close,
                            volume=stock_data.volume,
                            market_cap=stock_data.market_cap
                        )
                        renderer.render_success(f"新規株価データを保存しました: {stock_code}")
                
                # データを表示
                renderer.render_stock(stock_data, title=f"株価情報 - {stock_code}")
                
            except YahooFinanceError as e:
                renderer.render_error(f"株価データの取得に失敗しました: {str(e)}")
                sys.exit(1)
            except StorageError as e:
                renderer.render_error(f"データベース操作に失敗しました: {str(e)}")
                sys.exit(1)
            except Exception as e:
                renderer.render_error(f"予期しないエラーが発生しました: {str(e)}")
                sys.exit(1)
        
        # 非同期実行
        asyncio.run(fetch_and_display())
        
    except click.BadParameter as e:
        console.print(f"[red]エラー: {e}[/red]")
        sys.exit(1)


# ウォッチリスト管理コマンドグループ
@cli.group()
def watchlist():
    """ウォッチリストの管理。"""
    pass


@watchlist.command('add')
@click.argument('stock_code', type=str)
@click.option('--notes', type=str, help='メモ')
@click.option('--alert-high', type=float, help='高値アラート価格')
@click.option('--alert-low', type=float, help='安値アラート価格')
@click.pass_context
def watchlist_add(ctx, stock_code: str, notes: Optional[str], 
                 alert_high: Optional[float], alert_low: Optional[float]):
    """ウォッチリストに銘柄を追加。
    
    STOCK_CODE: 4桁の銘柄コード (例: 7203)
    """
    try:
        if not stock_code.isdigit() or len(stock_code) != 4:
            raise click.BadParameter('銘柄コードは4桁の数字である必要があります')
        
        renderer = StockRenderer(console=console)
        storage = StockStorageService()
        
        # まず株価データを取得・保存
        async def fetch_and_save():
            try:
                async with YahooFinanceClient() as client:
                    stock_data = await client.get_stock_info(stock_code)
                
                # 株式データをデータベースに保存
                try:
                    existing_stock = storage.get_stock(stock_code)
                    storage.update_stock(
                        stock_code=stock_code,
                        current_price=stock_data.current_price,
                        previous_close=stock_data.previous_close,
                        volume=stock_data.volume,
                        market_cap=stock_data.market_cap,
                        company_name=stock_data.company_name
                    )
                except StockNotFoundError:
                    storage.create_stock(
                        stock_code=stock_code,
                        company_name=stock_data.company_name,
                        current_price=stock_data.current_price,
                        previous_close=stock_data.previous_close,
                        volume=stock_data.volume,
                        market_cap=stock_data.market_cap
                    )
                
                return stock_data
                
            except YahooFinanceError as e:
                raise click.ClickException(f"株価データの取得に失敗しました: {str(e)}")
        
        # 非同期実行
        stock_data = asyncio.run(fetch_and_save())
        
        # ウォッチリストに追加
        alert_high_decimal = Decimal(str(alert_high)) if alert_high else None
        alert_low_decimal = Decimal(str(alert_low)) if alert_low else None
        
        watchlist_item = storage.create_watchlist_item(
            stock_code=stock_code,
            notes=notes,
            alert_price_high=alert_high_decimal,
            alert_price_low=alert_low_decimal
        )
        
        renderer.render_success(
            f"ウォッチリストに追加しました: {stock_code} ({stock_data.company_name})"
        )
        
    except (StorageError, click.ClickException) as e:
        console.print(f"[red]エラー: {e}[/red]")
        sys.exit(1)
    except click.BadParameter as e:
        console.print(f"[red]エラー: {e}[/red]")
        sys.exit(1)


@watchlist.command('remove')
@click.argument('stock_code', type=str)
@click.pass_context
def watchlist_remove(ctx, stock_code: str):
    """ウォッチリストから銘柄を削除。
    
    STOCK_CODE: 4桁の銘柄コード (例: 7203)
    """
    try:
        if not stock_code.isdigit() or len(stock_code) != 4:
            raise click.BadParameter('銘柄コードは4桁の数字である必要があります')
        
        storage = StockStorageService()
        renderer = StockRenderer(console=console)
        interactive = InteractiveRenderer(console=console)
        
        # 対象のウォッチリストアイテムを検索
        watchlist_items = storage.get_watchlist()
        target_items = [item for item in watchlist_items if item.stock_code == stock_code]
        
        if not target_items:
            renderer.render_error(f"銘柄コード {stock_code} はウォッチリストにありません")
            return
        
        # 複数ある場合（通常は1つだが）
        for item in target_items:
            if interactive.confirm_action(f"銘柄 {stock_code} をウォッチリストから削除しますか？"):
                storage.remove_from_watchlist(item.id)
                renderer.render_success(f"ウォッチリストから削除しました: {stock_code}")
            else:
                renderer.render_info("削除をキャンセルしました")
        
    except StorageError as e:
        console.print(f"[red]データベースエラー: {e}[/red]")
        sys.exit(1)
    except click.BadParameter as e:
        console.print(f"[red]エラー: {e}[/red]")
        sys.exit(1)


@watchlist.command('list')
@click.option('--show-inactive', is_flag=True, help='非アクティブな項目も表示')
@click.pass_context
def watchlist_list(ctx, show_inactive: bool):
    """ウォッチリストを表示。"""
    try:
        output_format = ctx.obj['format']
        storage = StockStorageService()
        renderer = WatchlistRenderer(console=console, format_type=output_format)
        
        active_only = not show_inactive
        watchlist_items = storage.get_watchlist(active_only=active_only)
        
        renderer.render_watchlist(watchlist_items, title="ウォッチリスト")
        
        if output_format == 'table':
            # テーブル形式の場合は統計情報も表示
            console.print("")  # 区切り行
            renderer.render_watchlist_summary(watchlist_items)
        
    except StorageError as e:
        console.print(f"[red]データベースエラー: {e}[/red]")
        sys.exit(1)


@watchlist.command('batch-add')
@click.option('--codes', type=str, required=True, help='カンマ区切りの銘柄コードリスト')
@click.option('--notes', type=str, help='共通メモ')
@click.pass_context
def watchlist_batch_add(ctx, codes: str, notes: Optional[str]):
    """複数銘柄を一括でウォッチリストに追加。
    
    例: --codes 7203,6758,4063,9984
    """
    try:
        stock_codes = [code.strip() for code in codes.split(',')]
        
        # 銘柄コードの検証
        for code in stock_codes:
            if not code.isdigit() or len(code) != 4:
                raise click.BadParameter(f'無効な銘柄コード: {code}')
        
        renderer = StockRenderer(console=console)
        progress_renderer = ProgressRenderer(console=console)
        storage = StockStorageService()
        
        successful_adds = []
        failed_adds = []
        
        async def process_stock_code(stock_code: str):
            try:
                # 株価データを取得
                async with YahooFinanceClient() as client:
                    stock_data = await client.get_stock_info(stock_code)
                
                # データベースに保存
                try:
                    existing_stock = storage.get_stock(stock_code)
                    storage.update_stock(
                        stock_code=stock_code,
                        current_price=stock_data.current_price,
                        previous_close=stock_data.previous_close,
                        volume=stock_data.volume,
                        market_cap=stock_data.market_cap,
                        company_name=stock_data.company_name
                    )
                except StockNotFoundError:
                    storage.create_stock(
                        stock_code=stock_code,
                        company_name=stock_data.company_name,
                        current_price=stock_data.current_price,
                        previous_close=stock_data.previous_close,
                        volume=stock_data.volume,
                        market_cap=stock_data.market_cap
                    )
                
                # ウォッチリストに追加
                storage.create_watchlist_item(
                    stock_code=stock_code,
                    notes=notes
                )
                
                successful_adds.append((stock_code, stock_data.company_name))
                
            except Exception as e:
                failed_adds.append((stock_code, str(e)))
        
        async def batch_process():
            tasks = [process_stock_code(code) for code in stock_codes]
            await asyncio.gather(*tasks, return_exceptions=True)
        
        # プログレス表示付きで実行
        progress_renderer.show_spinner("銘柄データを一括取得中...", lambda: asyncio.run(batch_process()))
        
        # 結果の表示
        if successful_adds:
            renderer.render_success(f"{len(successful_adds)} 銘柄をウォッチリストに追加しました:")
            for code, name in successful_adds:
                console.print(f"  • {code} - {name}")
        
        if failed_adds:
            renderer.render_error(f"{len(failed_adds)} 銘柄の追加に失敗しました:")
            for code, error in failed_adds:
                console.print(f"  • {code}: {error}")
        
    except click.BadParameter as e:
        console.print(f"[red]エラー: {e}[/red]")
        sys.exit(1)


# 価格更新コマンド
@cli.command()
@click.argument('stock_code', type=str, required=False)
@click.option('--all', 'update_all', is_flag=True, help='全ウォッチリスト銘柄を更新')
@click.pass_context
def update(ctx, stock_code: Optional[str], update_all: bool):
    """株価データを更新。
    
    STOCK_CODE: 4桁の銘柄コード (例: 7203) または --all で全銘柄
    """
    if not stock_code and not update_all:
        raise click.UsageError('銘柄コードまたは --all オプションを指定してください')
    
    if stock_code and update_all:
        raise click.UsageError('銘柄コードと --all オプションは同時に指定できません')
    
    try:
        storage = StockStorageService()
        renderer = StockRenderer(console=console)
        progress_renderer = ProgressRenderer(console=console)
        
        if update_all:
            # 全ウォッチリスト銘柄を更新
            watchlist_items = storage.get_watchlist()
            stock_codes = [item.stock_code for item in watchlist_items]
            
            if not stock_codes:
                renderer.render_info("ウォッチリストに銘柄がありません")
                return
            
            renderer.render_info(f"{len(stock_codes)} 銘柄を更新します...")
        else:
            # 単一銘柄を更新
            if not stock_code.isdigit() or len(stock_code) != 4:
                raise click.BadParameter('銘柄コードは4桁の数字である必要があります')
            stock_codes = [stock_code]
        
        successful_updates = []
        failed_updates = []
        
        async def update_stock_data(code: str):
            try:
                async with YahooFinanceClient() as client:
                    stock_data = await client.get_stock_info(code)
                
                # データベースを更新
                storage.update_stock(
                    stock_code=code,
                    current_price=stock_data.current_price,
                    previous_close=stock_data.previous_close,
                    volume=stock_data.volume,
                    market_cap=stock_data.market_cap,
                    company_name=stock_data.company_name
                )
                
                successful_updates.append((code, stock_data.company_name))
                
            except Exception as e:
                failed_updates.append((code, str(e)))
        
        async def batch_update():
            tasks = [update_stock_data(code) for code in stock_codes]
            await asyncio.gather(*tasks, return_exceptions=True)
        
        # プログレス表示付きで実行
        progress_renderer.show_spinner("株価データを更新中...", lambda: asyncio.run(batch_update()))
        
        # 結果の表示
        if successful_updates:
            renderer.render_success(f"{len(successful_updates)} 銘柄の更新が完了しました:")
            for code, name in successful_updates:
                console.print(f"  • {code} - {name}")
        
        if failed_updates:
            renderer.render_error(f"{len(failed_updates)} 銘柄の更新に失敗しました:")
            for code, error in failed_updates:
                console.print(f"  • {code}: {error}")
        
    except (StorageError, click.BadParameter, click.UsageError) as e:
        console.print(f"[red]エラー: {e}[/red]")
        sys.exit(1)


# 価格履歴表示コマンド
@cli.command()
@click.argument('stock_code', type=str)
@click.option('--days', type=int, default=30, help='履歴日数 (デフォルト: 30日)')
@click.option('--history', 'show_history', is_flag=True, help='価格履歴を表示')
@click.pass_context
def history(ctx, stock_code: str, days: int, show_history: bool):
    """株価履歴を表示。
    
    STOCK_CODE: 4桁の銘柄コード (例: 7203)
    """
    try:
        if not stock_code.isdigit() or len(stock_code) != 4:
            raise click.BadParameter('銘柄コードは4桁の数字である必要があります')
        
        if days <= 0:
            raise click.BadParameter('日数は正の数値である必要があります')
        
        output_format = ctx.obj['format']
        renderer = PriceHistoryRenderer(console=console, format_type=output_format)
        storage = StockStorageService()
        
        # まず現在の株価データが存在するかチェック
        try:
            stock = storage.get_stock(stock_code)
            company_name = stock.company_name
        except StockNotFoundError:
            renderer.render_error(f"銘柄 {stock_code} のデータがデータベースにありません。まず search コマンドで取得してください。")
            return
        
        # 価格履歴を取得
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        price_history = storage.get_price_history(
            stock_code=stock_code,
            start_date=start_date,
            end_date=end_date,
            limit=days
        )
        
        if price_history:
            renderer.render_price_history(
                price_history=price_history,
                stock_code=f"{stock_code} ({company_name})",
                show_summary=True
            )
        else:
            # データベースに履歴がない場合はAPIから取得
            renderer.render_info(f"データベースに履歴がありません。Yahoo Financeから {days} 日分のデータを取得します...")
            
            async def fetch_history():
                try:
                    async with YahooFinanceClient() as client:
                        history_data = await client.get_price_history(stock_code, days=days)
                    
                    if history_data and history_data.history:
                        # データベースに保存
                        for item in history_data.history:
                            try:
                                storage.add_price_history(
                                    stock_code=item.stock_code,
                                    date=item.date,
                                    open_price=item.open_price,
                                    high_price=item.high_price,
                                    low_price=item.low_price,
                                    close_price=item.close_price,
                                    volume=item.volume,
                                    adj_close=item.adj_close
                                )
                            except StorageError:
                                # 重複データは無視
                                pass
                        
                        # データベースから再取得して表示
                        saved_history = storage.get_price_history(
                            stock_code=stock_code,
                            start_date=start_date,
                            end_date=end_date,
                            limit=days
                        )
                        
                        renderer.render_price_history(
                            price_history=saved_history,
                            stock_code=f"{stock_code} ({company_name})",
                            show_summary=True
                        )
                    else:
                        renderer.render_error(f"銘柄 {stock_code} の履歴データが取得できませんでした")
                
                except YahooFinanceError as e:
                    renderer.render_error(f"履歴データの取得に失敗しました: {str(e)}")
            
            # 非同期実行
            asyncio.run(fetch_history())
        
    except (StorageError, click.BadParameter) as e:
        console.print(f"[red]エラー: {e}[/red]")
        sys.exit(1)


if __name__ == '__main__':
    cli()