"""
Connection Management and Reconnection Logic

This module provides robust connection management and automatic reconnection
logic for WebSocket connections and external data providers.
"""

import asyncio
import logging
import time
import random
from datetime import datetime
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class ConnectionStatus(Enum):
    """Connection status states"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    FAILED = "failed"

@dataclass
class ConnectionConfig:
    """Configuration for connection management"""
    # Reconnection settings
    max_reconnect_attempts: int = 5
    initial_reconnect_delay: float = 1.0  # seconds
    max_reconnect_delay: float = 60.0  # seconds
    reconnect_backoff_multiplier: float = 2.0
    reconnect_jitter: bool = True
    
    # Connection health
    heartbeat_interval: float = 30.0  # seconds
    heartbeat_timeout: float = 10.0  # seconds
    connection_timeout: float = 30.0  # seconds
    
    # Connection pooling
    max_connections: int = 100
    connection_ttl: float = 3600.0  # seconds
    
    # Error handling
    retry_on_errors: List[int] = None  # HTTP status codes to retry on
    
    def __post_init__(self):
        if self.retry_on_errors is None:
            self.retry_on_errors = [502, 503, 504, 429]

@dataclass
class ConnectionInfo:
    """Information about a connection"""
    id: str
    url: str
    status: ConnectionStatus
    connected_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None
    reconnect_attempts: int = 0
    last_error: Optional[str] = None
    error_count: int = 0
    data_transferred: int = 0  # bytes
    messages_sent: int = 0
    messages_received: int = 0

class ConnectionManager:
    """Manages connections and reconnection logic"""
    
    def __init__(self, config: ConnectionConfig):
        self.config = config
        self.connections: Dict[str, ConnectionInfo] = {}
        self.reconnect_tasks: Dict[str, asyncio.Task] = {}
        self.heartbeat_tasks: Dict[str, asyncio.Task] = {}
        self.is_running = False
        self._lock = asyncio.Lock()
        
    async def start(self):
        """Start the connection manager"""
        if self.is_running:
            return
            
        self.is_running = True
        logger.info("Connection manager started")
    
    async def stop(self):
        """Stop the connection manager"""
        self.is_running = False
        
        # Cancel all reconnect tasks
        for task in self.reconnect_tasks.values():
            task.cancel()
        
        # Cancel all heartbeat tasks
        for task in self.heartbeat_tasks.values():
            task.cancel()
        
        self.reconnect_tasks.clear()
        self.heartbeat_tasks.clear()
        
        logger.info("Connection manager stopped")
    
    async def create_connection(
        self, 
        connection_id: str, 
        url: str,
        connect_callback: Callable,
        disconnect_callback: Optional[Callable] = None,
        error_callback: Optional[Callable] = None
    ) -> bool:
        """Create and manage a new connection"""
        async with self._lock:
            # Create connection info
            connection_info = ConnectionInfo(
                id=connection_id,
                url=url,
                status=ConnectionStatus.DISCONNECTED
            )
            self.connections[connection_id] = connection_info
            
            # Start connection
            return await self._connect(connection_info, connect_callback, disconnect_callback, error_callback)
    
    async def _connect(
        self, 
        connection_info: ConnectionInfo,
        connect_callback: Callable,
        disconnect_callback: Optional[Callable] = None,
        error_callback: Optional[Callable] = None
    ) -> bool:
        """Establish a connection"""
        try:
            connection_info.status = ConnectionStatus.CONNECTING
            connection_info.last_activity = datetime.now()
            
            # Attempt to connect
            await connect_callback()
            
            # Connection successful
            connection_info.status = ConnectionStatus.CONNECTED
            connection_info.connected_at = datetime.now()
            connection_info.reconnect_attempts = 0
            connection_info.last_error = None
            
            logger.info(f"Connected to {connection_info.url} (ID: {connection_info.id})")
            
            # Start heartbeat if configured
            if self.config.heartbeat_interval > 0:
                heartbeat_task = asyncio.create_task(
                    self._heartbeat_task(connection_info, disconnect_callback)
                )
                self.heartbeat_tasks[connection_info.id] = heartbeat_task
            
            return True
            
        except Exception as e:
            error_msg = str(e)
            connection_info.status = ConnectionStatus.FAILED
            connection_info.last_error = error_msg
            connection_info.error_count += 1
            
            logger.error(f"Failed to connect to {connection_info.url} (ID: {connection_info.id}): {error_msg}")
            
            # Call error callback if provided
            if error_callback:
                try:
                    await error_callback(e)
                except Exception as cb_error:
                    logger.error(f"Error in connection error callback: {cb_error}")
            
            # Start reconnection process
            await self._schedule_reconnect(connection_info, connect_callback, disconnect_callback, error_callback)
            return False
    
    async def disconnect(self, connection_id: str, disconnect_callback: Optional[Callable] = None):
        """Disconnect a connection"""
        async with self._lock:
            if connection_id in self.connections:
                connection_info = self.connections[connection_id]
                connection_info.status = ConnectionStatus.DISCONNECTED
                connection_info.connected_at = None
                
                # Cancel reconnect task if exists
                if connection_id in self.reconnect_tasks:
                    self.reconnect_tasks[connection_id].cancel()
                    del self.reconnect_tasks[connection_id]
                
                # Cancel heartbeat task if exists
                if connection_id in self.heartbeat_tasks:
                    self.heartbeat_tasks[connection_id].cancel()
                    del self.heartbeat_tasks[connection_id]
                
                # Call disconnect callback if provided
                if disconnect_callback:
                    try:
                        await disconnect_callback()
                    except Exception as e:
                        logger.error(f"Error in disconnect callback: {e}")
                
                logger.info(f"Disconnected from {connection_info.url} (ID: {connection_id})")
    
    async def _schedule_reconnect(
        self, 
        connection_info: ConnectionInfo,
        connect_callback: Callable,
        disconnect_callback: Optional[Callable] = None,
        error_callback: Optional[Callable] = None
    ):
        """Schedule a reconnection attempt"""
        if connection_info.reconnect_attempts >= self.config.max_reconnect_attempts:
            logger.error(f"Max reconnection attempts reached for {connection_info.url} (ID: {connection_info.id})")
            return
        
        # Calculate delay with exponential backoff
        delay = self.config.initial_reconnect_delay * (
            self.config.reconnect_backoff_multiplier ** connection_info.reconnect_attempts
        )
        
        # Cap delay at maximum
        delay = min(delay, self.config.max_reconnect_delay)
        
        # Add jitter if enabled
        if self.config.reconnect_jitter:
            delay *= (0.5 + random.random() * 0.5)
        
        connection_info.status = ConnectionStatus.RECONNECTING
        connection_info.reconnect_attempts += 1
        connection_info.last_activity = datetime.now()
        
        logger.info(f"Scheduling reconnection for {connection_info.url} (ID: {connection_info.id}) in {delay:.2f}s")
        
        # Create reconnect task
        reconnect_task = asyncio.create_task(
            self._reconnect_after_delay(
                connection_info, 
                delay, 
                connect_callback, 
                disconnect_callback, 
                error_callback
            )
        )
        self.reconnect_tasks[connection_info.id] = reconnect_task
    
    async def _reconnect_after_delay(
        self, 
        connection_info: ConnectionInfo,
        delay: float,
        connect_callback: Callable,
        disconnect_callback: Optional[Callable] = None,
        error_callback: Optional[Callable] = None
    ):
        """Reconnect after a delay"""
        try:
            await asyncio.sleep(delay)
            
            # Check if we're still running
            if not self.is_running:
                return
            
            # Remove task from tracking
            if connection_info.id in self.reconnect_tasks:
                del self.reconnect_tasks[connection_info.id]
            
            # Attempt to reconnect
            await self._connect(connection_info, connect_callback, disconnect_callback, error_callback)
            
        except asyncio.CancelledError:
            logger.info(f"Reconnection cancelled for {connection_info.url} (ID: {connection_info.id})")
        except Exception as e:
            logger.error(f"Error in reconnection task for {connection_info.url} (ID: {connection_info.id}): {e}")
    
    async def _heartbeat_task(
        self, 
        connection_info: ConnectionInfo, 
        disconnect_callback: Optional[Callable] = None
    ):
        """Send periodic heartbeats to check connection health"""
        try:
            while self.is_running and connection_info.status == ConnectionStatus.CONNECTED:
                try:
                    # Wait for heartbeat interval
                    await asyncio.sleep(self.config.heartbeat_interval)
                    
                    # Send heartbeat (implementation would depend on connection type)
                    # For WebSocket, this might be a ping/pong
                    # For HTTP, this might be a health check request
                    
                    # Update last activity
                    connection_info.last_activity = datetime.now()
                    
                    # Check if connection is stale
                    time_since_activity = (datetime.now() - connection_info.last_activity).total_seconds()
                    if time_since_activity > self.config.heartbeat_timeout:
                        logger.warning(f"Connection {connection_info.id} timed out")
                        await self._handle_connection_timeout(connection_info, disconnect_callback)
                        
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in heartbeat for {connection_info.id}: {e}")
                    
        except Exception as e:
            logger.error(f"Error in heartbeat task for {connection_info.id}: {e}")
        finally:
            # Clean up task tracking
            if connection_info.id in self.heartbeat_tasks:
                del self.heartbeat_tasks[connection_info.id]
    
    async def _handle_connection_timeout(
        self, 
        connection_info: ConnectionInfo, 
        disconnect_callback: Optional[Callable] = None
    ):
        """Handle connection timeout"""
        try:
            # Disconnect
            if disconnect_callback:
                await disconnect_callback()
            
            connection_info.status = ConnectionStatus.DISCONNECTED
            connection_info.connected_at = None
            
            # Cancel heartbeat task
            if connection_info.id in self.heartbeat_tasks:
                self.heartbeat_tasks[connection_info.id].cancel()
                del self.heartbeat_tasks[connection_info.id]
                
        except Exception as e:
            logger.error(f"Error handling timeout for {connection_info.id}: {e}")
    
    async def update_connection_stats(
        self, 
        connection_id: str, 
        data_sent: int = 0, 
        data_received: int = 0,
        messages_sent: int = 0,
        messages_received: int = 0
    ):
        """Update connection statistics"""
        async with self._lock:
            if connection_id in self.connections:
                connection_info = self.connections[connection_id]
                connection_info.data_transferred += data_sent + data_received
                connection_info.messages_sent += messages_sent
                connection_info.messages_received += messages_received
                connection_info.last_activity = datetime.now()
    
    async def get_connection_info(self, connection_id: str) -> Optional[ConnectionInfo]:
        """Get connection information"""
        async with self._lock:
            return self.connections.get(connection_id)
    
    async def get_all_connections(self) -> List[ConnectionInfo]:
        """Get information about all connections"""
        async with self._lock:
            return list(self.connections.values())
    
    async def is_connection_healthy(self, connection_id: str) -> bool:
        """Check if a connection is healthy"""
        connection_info = await self.get_connection_info(connection_id)
        if not connection_info:
            return False
        
        # Check status
        if connection_info.status != ConnectionStatus.CONNECTED:
            return False
        
        # Check activity
        if connection_info.last_activity:
            time_since_activity = (datetime.now() - connection_info.last_activity).total_seconds()
            if time_since_activity > self.config.connection_timeout:
                return False
        
        return True
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get overall connection statistics"""
        async def _get_stats():
            async with self._lock:
                total_connections = len(self.connections)
                connected_count = sum(
                    1 for conn in self.connections.values() 
                    if conn.status == ConnectionStatus.CONNECTED
                )
                reconnecting_count = sum(
                    1 for conn in self.connections.values() 
                    if conn.status == ConnectionStatus.RECONNECTING
                )
                
                total_data_transferred = sum(
                    conn.data_transferred for conn in self.connections.values()
                )
                total_messages = sum(
                    conn.messages_sent + conn.messages_received 
                    for conn in self.connections.values()
                )
                
                return {
                    "total_connections": total_connections,
                    "connected": connected_count,
                    "reconnecting": reconnecting_count,
                    "total_data_transferred": total_data_transferred,
                    "total_messages": total_messages,
                    "max_connections": self.config.max_connections
                }
        
        # Run async function and return result
        return asyncio.get_event_loop().run_until_complete(_get_stats())

# Global connection manager instance
_connection_manager: Optional[ConnectionManager] = None
_connection_manager_lock = asyncio.Lock()

async def get_connection_manager(config: Optional[ConnectionConfig] = None) -> ConnectionManager:
    """Get global connection manager instance"""
    global _connection_manager
    
    async with _connection_manager_lock:
        if _connection_manager is None:
            if config is None:
                config = ConnectionConfig()
            _connection_manager = ConnectionManager(config)
            await _connection_manager.start()
        return _connection_manager

async def cleanup_connection_manager():
    """Cleanup global connection manager instance"""
    global _connection_manager
    
    async with _connection_manager_lock:
        if _connection_manager:
            await _connection_manager.stop()
            _connection_manager = None