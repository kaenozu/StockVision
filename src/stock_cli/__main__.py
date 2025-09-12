"""
株価トラッキングCLIアプリケーションのメインエントリーポイント。

このモジュールは python -m src.stock_cli で実行される際の
エントリーポイントを提供します。
"""

import os
import sys
from pathlib import Path

# プロジェクトルートをPYTHONPATHに追加
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    from rich.console import Console
    from rich.traceback import install

    from .commands import cli

    # Rich トレースバック機能を有効化（開発時のデバッグ用）
    install(show_locals=False)

    console = Console()

except ImportError as e:
    print(f"モジュールのインポートに失敗しました: {e}")
    print("必要な依存関係がインストールされているか確認してください。")
    print("pip install -r requirements.txt")
    sys.exit(1)


def main():
    """メイン関数 - CLIコマンドを実行。"""
    try:
        # データベースの初期化チェック
        from ..stock_storage.database import check_database_exists, init_db

        if not check_database_exists():
            console.print("[yellow]データベースが初期化されていません。[/yellow]")
            console.print("初期化を実行しています...")

            try:
                init_db()
                console.print("[green]データベースの初期化が完了しました。[/green]")
            except Exception as e:
                console.print(f"[red]データベースの初期化に失敗しました: {e}[/red]")
                console.print("手動で初期化を実行してください:")
                console.print(
                    'python -c "from src.stock_storage.database import init_db; init_db()"'
                )
                sys.exit(1)

        # CLIコマンドを実行
        cli()

    except KeyboardInterrupt:
        console.print("\n[yellow]処理が中断されました。[/yellow]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]予期しないエラーが発生しました: {e}[/red]")
        # 開発環境では詳細なエラー情報を表示
        if os.getenv("STOCK_CLI_DEBUG", "").lower() in ("true", "1", "yes"):
            import traceback

            console.print(traceback.format_exc())
        else:
            console.print(
                "詳細なエラー情報が必要な場合は、環境変数 STOCK_CLI_DEBUG=true を設定してください。"
            )
        sys.exit(1)


if __name__ == "__main__":
    main()
