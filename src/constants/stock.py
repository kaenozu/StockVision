"""
Stock market related constants for the StockVision application.
"""


# Stock price constants
class StockPrice:
    MIN_VOLUME = 100000
    MAX_VOLUME = 10000000
    MIN_MARKET_CAP_MULTIPLIER = 1000000
    MAX_MARKET_CAP_MULTIPLIER = 100000000


# Volume formatting thresholds
class VolumeFormat:
    MAN_THRESHOLD = 10000  # 万 (10 thousand)


# Stock market status
class MarketStatus:
    OPEN = "open"
    CLOSED = "closed"
    PRE_MARKET = "pre_market"
    AFTER_HOURS = "after_hours"


# Stock data fields
class StockFields:
    SYMBOL = "symbol"
    CODE = "code"
    NAME = "name"
    PRICE = "price"
    CHANGE = "change"
    CHANGE_PERCENT = "change_percent"
    VOLUME = "volume"
    MARKET_CAP = "market_cap"
    OPEN = "open"
    HIGH = "high"
    LOW = "low"
    CLOSE = "close"


# Default stock codes (for testing/demo)
class DefaultStocks:
    TOYOTA = "7203"
    SOFTBANK = "9984"
    SONY = "6758"
    NINTENDO = "7974"
    KEYENCE = "6861"
    FAST_RETAILING = "9983"

    ALL_CODES = [TOYOTA, SOFTBANK, SONY, NINTENDO, KEYENCE, FAST_RETAILING]
