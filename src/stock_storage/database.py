"""
Database setup and configuration for stock tracking application.

This module provides database engine creation, session factory setup,
and connection pooling configuration using SQLAlchemy for SQLite.
"""
import logging
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Optional

from sqlalchemy import create_engine, event, pool, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

from ..models.stock import Base
from ..middleware.metrics import observe_db_query

logger = logging.getLogger(__name__)


class DatabaseConfig:
    """Database configuration class."""
    
    def __init__(self, db_path: Optional[str] = None):
        """Initialize database configuration.
        
        Args:
            db_path: Path to the SQLite database file. If None, uses default path.
        """
        if db_path is None:
            # デフォルトのデータベースパス（プロジェクトルート/data/stock_tracking.db）
            project_root = Path(__file__).parent.parent.parent
            data_dir = project_root / "data"
            data_dir.mkdir(exist_ok=True)
            db_path = data_dir / "stock_tracking.db"
        
        self.db_path = Path(db_path)
        self.database_url = f"sqlite:///{self.db_path}"


class DatabaseManager:
    """Database manager for handling SQLite database operations."""
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        """Initialize database manager.
        
        Args:
            config: Database configuration. If None, uses default configuration.
        """
        self.config = config or DatabaseConfig()
        self._engine: Optional[Engine] = None
        self._session_factory: Optional[sessionmaker] = None
        
    def create_engine(self) -> Engine:
        """Create SQLAlchemy engine with optimized settings for SQLite.
        
        Returns:
            SQLAlchemy Engine instance.
        """
        if self._engine is not None:
            return self._engine
            
        # SQLite接続設定（パフォーマンス最適化）
        engine_kwargs = {
            "echo": os.getenv("DATABASE_DEBUG", "false").lower() == "true",
            "pool_pre_ping": True,
            "poolclass": pool.StaticPool,
            "pool_recycle": 3600,  # 1時間でプール接続をリサイクル
            "connect_args": {
                "check_same_thread": False,  # SQLiteでマルチスレッドを有効化
                "timeout": 5,  # 接続タイムアウトを短縮（5秒）
                "isolation_level": None,  # autocommit mode
            },
        }
        
        try:
            self._engine = create_engine(self.config.database_url, **engine_kwargs)
            
            # SQLite最適化設定のイベントハンドラ（パフォーマンス最適化）
            @event.listens_for(self._engine, "connect")
            def set_sqlite_pragma(dbapi_connection, connection_record):
                """Set SQLite pragma settings for maximum performance optimization."""
                cursor = dbapi_connection.cursor()
                # WALモードで並行性を向上
                cursor.execute("PRAGMA journal_mode=WAL")
                # 同期モードを高速化（データの整合性は保持）
                cursor.execute("PRAGMA synchronous=NORMAL")
                # キャッシュサイズを大幅増加（50MB）
                cursor.execute("PRAGMA cache_size=50000")
                # 外部キー制約を有効化
                cursor.execute("PRAGMA foreign_keys=ON")
                # テンポラリファイル用メモリ使用
                cursor.execute("PRAGMA temp_store=MEMORY")
                # プリロード最適化
                cursor.execute("PRAGMA optimize")
                # メモリマップサイズ設定（64MB）
                cursor.execute("PRAGMA mmap_size=67108864")
                # ページサイズ最適化
                cursor.execute("PRAGMA page_size=8192")
                # 自動バキューム設定
                cursor.execute("PRAGMA auto_vacuum=INCREMENTAL")
                cursor.close()

            # Query timing for metrics (lightweight, no SQL labels to avoid cardinality)
            @event.listens_for(self._engine, "before_cursor_execute")
            def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
                try:
                    import time as _t
                    context._query_start_time = _t.perf_counter()
                except Exception:
                    context._query_start_time = None

            @event.listens_for(self._engine, "after_cursor_execute")
            def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
                try:
                    import time as _t
                    if getattr(context, "_query_start_time", None) is not None:
                        duration = _t.perf_counter() - context._query_start_time
                        observe_db_query(duration)
                except Exception:
                    pass

            logger.info(f"Database engine created: {self.config.database_url}")
            return self._engine
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to create database engine: {e}")
            raise
    
    def get_session_factory(self) -> sessionmaker:
        """Get session factory for creating database sessions.
        
        Returns:
            SQLAlchemy sessionmaker instance.
        """
        if self._session_factory is not None:
            return self._session_factory
            
        engine = self.create_engine()
        self._session_factory = sessionmaker(
            bind=engine,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False  # セッションコミット後もオブジェクトを使用可能に
        )
        
        logger.info("Session factory created")
        return self._session_factory
    
    def init_db(self) -> None:
        """Initialize database by creating all tables.
        
        Raises:
            SQLAlchemyError: If database initialization fails.
        """
        try:
            engine = self.create_engine()
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully")
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    def drop_all_tables(self) -> None:
        """Drop all tables in the database.
        
        Warning: This will delete all data!
        
        Raises:
            SQLAlchemyError: If dropping tables fails.
        """
        try:
            engine = self.create_engine()
            Base.metadata.drop_all(bind=engine)
            logger.warning("All database tables dropped")
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to drop tables: {e}")
            raise
    
    def get_session(self) -> Session:
        """Create a new database session.
        
        Returns:
            SQLAlchemy Session instance.
        """
        session_factory = self.get_session_factory()
        session = session_factory()
        logger.debug("New database session created")
        return session
    
    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """Provide a transactional scope around database operations.
        
        Yields:
            SQLAlchemy Session instance.
            
        Example:
            with db_manager.session_scope() as session:
                stock = session.query(Stock).first()
                # 自動的にコミット・ロールバック処理
        """
        session = self.get_session()
        try:
            yield session
            session.commit()
            logger.debug("Database transaction committed")
        except Exception as e:
            session.rollback()
            logger.error(f"Database transaction rolled back: {e}")
            raise
        finally:
            session.close()
            logger.debug("Database session closed")
    
    def close(self) -> None:
        """Close database engine and cleanup resources."""
        if self._engine is not None:
            self._engine.dispose()
            self._engine = None
            self._session_factory = None
            logger.info("Database engine disposed")


# グローバルデータベースマネージャーインスタンス
_db_manager: Optional[DatabaseManager] = None


def get_database_manager() -> DatabaseManager:
    """Get the global database manager instance.
    
    Returns:
        DatabaseManager instance.
    """
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager()
    return _db_manager


def check_database_exists(config: Optional[DatabaseConfig] = None) -> bool:
    """Check if database file exists and has the required tables.
    
    Args:
        config: Database configuration. If None, uses default configuration.
        
    Returns:
        True if database exists and is properly initialized, False otherwise.
    """
    try:
        config = config or DatabaseConfig()
        
        # データベースファイルの存在確認
        if not config.db_path.exists():
            return False
        
        # テーブルの存在確認（軽量チェック）
        from sqlalchemy import create_engine, inspect
        engine = create_engine(config.database_url)
        inspector = inspect(engine)
        
        # 必要なテーブルが存在するかチェック
        required_tables = ['stocks', 'watchlist', 'price_history']
        existing_tables = inspector.get_table_names()
        
        for table in required_tables:
            if table not in existing_tables:
                return False
        
        engine.dispose()
        return True
        
    except Exception:
        return False


def init_db(config: Optional[DatabaseConfig] = None) -> None:
    """Initialize the database with tables.
    
    Args:
        config: Database configuration. If None, uses default configuration.
    """
    global _db_manager
    _db_manager = DatabaseManager(config)
    _db_manager.init_db()


def get_session() -> Session:
    """Get a new database session.
    
    Returns:
        SQLAlchemy Session instance.
    """
    db_manager = get_database_manager()
    return db_manager.get_session()


@contextmanager
def get_session_scope() -> Generator[Session, None, None]:
    """Get a transactional database session scope.
    
    Yields:
        SQLAlchemy Session instance.
    """
    db_manager = get_database_manager()
    with db_manager.session_scope() as session:
        yield session


def close_database() -> None:
    """Close the database connection and cleanup resources."""
    global _db_manager
    if _db_manager is not None:
        _db_manager.close()
        _db_manager = None


# データベース接続の健全性チェック関数
def check_database_health() -> bool:
    """Check if database connection is healthy.
    
    Returns:
        True if database is accessible, False otherwise.
    """
    try:
        with get_session_scope() as session:
            # 簡単なクエリでデータベース接続を確認
            session.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


# データベース統計情報取得関数
def get_database_stats() -> dict:
    """Get database statistics and information.
    
    Returns:
        Dictionary containing database statistics.
    """
    stats = {}
    
    try:
        with get_session_scope() as session:
            # テーブルごとのレコード数を取得
            from ..models.stock import Stock
            from ..models.watchlist import Watchlist
            from ..models.price_history import PriceHistory
            
            stats['stocks_count'] = session.query(Stock).count()
            stats['watchlist_count'] = session.query(Watchlist).count()
            stats['price_history_count'] = session.query(PriceHistory).count()
            
            # データベースファイルサイズ
            db_manager = get_database_manager()
            if db_manager.config.db_path.exists():
                stats['database_size_mb'] = round(
                    db_manager.config.db_path.stat().st_size / (1024 * 1024), 2
                )
            else:
                stats['database_size_mb'] = 0
            
            stats['database_path'] = str(db_manager.config.db_path)
            stats['healthy'] = True
            
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        stats['error'] = str(e)
        stats['healthy'] = False
    
    return stats
