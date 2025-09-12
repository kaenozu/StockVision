"""
Market hours and trading status utilities for Japan Stock Exchange.
"""

import datetime
from typing import Literal
from zoneinfo import ZoneInfo

MarketStatus = Literal["open", "closed", "pre_market", "after_hours"]


def get_japan_market_status() -> MarketStatus:
    """
    Determine the current market status for Tokyo Stock Exchange.

    Returns:
        MarketStatus: Current market status

    TSE Trading Hours (JST):
    - Morning Session: 9:00 - 11:30
    - Lunch Break: 11:30 - 12:30
    - Afternoon Session: 12:30 - 15:00
    - Pre-market: 8:00 - 9:00
    - After-hours: 15:00 - 17:00
    - Closed: Weekends and outside trading hours
    """
    try:
        # Get current Japan time
        jst = ZoneInfo("Asia/Tokyo")
        now = datetime.datetime.now(jst)

        # Check if it's a weekend (Saturday=5, Sunday=6)
        if now.weekday() >= 5:
            return "closed"

        # Extract hour and minute for time comparison
        current_time = now.time()

        # Define market hours
        pre_market_start = datetime.time(8, 0)  # 8:00
        morning_start = datetime.time(9, 0)  # 9:00
        morning_end = datetime.time(11, 30)  # 11:30
        afternoon_start = datetime.time(12, 30)  # 12:30
        afternoon_end = datetime.time(15, 0)  # 15:00
        after_hours_end = datetime.time(17, 0)  # 17:00

        # Determine market status
        if pre_market_start <= current_time < morning_start:
            return "pre_market"
        elif morning_start <= current_time < morning_end:
            return "open"
        elif afternoon_start <= current_time < afternoon_end:
            return "open"
        elif afternoon_end <= current_time < after_hours_end:
            return "after_hours"
        else:
            return "closed"

    except Exception:
        # Fallback to closed if there's any error
        return "closed"


def get_market_status_display(status: MarketStatus) -> str:
    """
    Get Japanese display text for market status.

    Args:
        status: Market status

    Returns:
        str: Japanese display text
    """
    status_map = {
        "open": "取引中",
        "closed": "取引終了",
        "pre_market": "取引前",
        "after_hours": "時間外",
    }
    return status_map.get(status, "不明")


def is_market_open() -> bool:
    """
    Check if the market is currently open for trading.

    Returns:
        bool: True if market is open
    """
    return get_japan_market_status() == "open"
