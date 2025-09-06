            stock_code = info.data.get('stock_code')
            if stock_code:
                for item in v:
                    if item.stock_code != stock_code:
                        raise ValueError(f"History item stock code {item.stock_code} does not match {stock_code}")
        return v
    
    @model_validator(mode='before')
    @classmethod
    def validate_date_range(cls, values):
        """Validate date range consistency."""
        history = values.get('history', [])
        start_date = values.get('start_date')
        end_date = values.get('end_date')

        if history:
<<<<<<< HEAD
            actual_dates = [item.date.date() if isinstance(item.date, datetime) else item.date for item in history]
            if actual_dates:
                actual_start = min(actual_dates)
                actual_end = max(actual_dates)

                if start_date and actual_start < start_date:
                    raise ValueError(f"History contains dates before start_date {start_date}")

                if end_date and actual_end > end_date:
                    raise ValueError(f"History contains dates after end_date {end_date}")

=======
            from datetime import datetime as _dt
            def _to_dt(v):
                if isinstance(v, _dt):
                    return v
                if isinstance(v, date):
                    return _dt(v.year, v.month, v.day)
                return _dt.strptime(v, "%Y-%m-%d")
            actual_dates = [_to_dt(item.date).date() for item in history]
            actual_start = min(actual_dates)
            actual_end = max(actual_dates)
            
            if start_date and actual_start < start_date:
                raise ValueError(f"History contains dates before start_date {start_date}")
            
            if end_date and actual_end > end_date:
                raise ValueError(f"History contains dates after end_date {end_date}")
        
>>>>>>> origin/main
        return values
    
    def get_latest_item(self) -> Optional[PriceHistoryItem]:
        """Get the latest price history item."""
        if not self.history:
            return None
<<<<<<< HEAD
        return max(self.history, key=lambda x: x.date)
=======
        from datetime import datetime as _dt
        def _to_dt(v):
            if isinstance(v, _dt):
                return v
            if isinstance(v, date):
                return _dt(v.year, v.month, v.day)
            return _dt.strptime(v, "%Y-%m-%d")
        return max(self.history, key=lambda x: _to_dt(x.date).date())
>>>>>>> origin/main
    
    def get_oldest_item(self) -> Optional[PriceHistoryItem]:
        """Get the oldest price history item."""
        if not self.history:
            return None
<<<<<<< HEAD
        return min(self.history, key=lambda x: x.date)
=======
        from datetime import datetime as _dt
        def _to_dt(v):
            if isinstance(v, _dt):
                return v
            if isinstance(v, date):
                return _dt(v.year, v.month, v.day)
            return _dt.strptime(v, "%Y-%m-%d")
        return min(self.history, key=lambda x: _to_dt(x.date).date())
>>>>>>> origin/main
    
    def sort_by_date(self, ascending: bool = True) -> List[PriceHistoryItem]:
        """Sort history items by date.
        
        Args:
            ascending: If True, sort ascending (oldest first), else descending
            
        Returns:
            Sorted list of price history items
        """
<<<<<<< HEAD
        return sorted(self.history, key=lambda x: x.date, reverse=not ascending)
=======
        from datetime import datetime as _dt
        def _to_dt(v):
            if isinstance(v, _dt):
                return v
            if isinstance(v, date):
                return _dt(v.year, v.month, v.day)
            return _dt.strptime(v, "%Y-%m-%d")
        return sorted(self.history, key=lambda x: _to_dt(x.date).date(), reverse=not ascending)
>>>>>>> origin/main
    
    def filter_by_date_range(self, start_date: date, end_date: date) -> 'PriceHistoryData':
        """Filter history by date range.
        
        Args:
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            
        Returns:
            New PriceHistoryData with filtered history
        """
<<<<<<< HEAD
        filtered_history = [
            item for item in self.history
            if start_date <= (item.date.date() if isinstance(item.date, datetime) else item.date) <= end_date
=======
        from datetime import datetime as _dt
        filtered_history = [
            item for item in self.history
            if start_date <= (_dt(item.date.year, item.date.month, item.date.day).date() if isinstance(item.date, date) else (_dt.strptime(item.date, "%Y-%m-%d").date() if isinstance(item.date, str) else item.date.date())) <= end_date
>>>>>>> origin/main
        ]
        
        return PriceHistoryData(
            stock_code=self.stock_code,
            history=filtered_history,
            start_date=start_date,
            end_date=end_date
        )


# Request/Response models for API operations
class StockInfoRequest(BaseModel):
    """Request model for stock information."""
    
    stock_code: str = Field(..., description="4-digit stock code")
    
    @field_validator('stock_code')
    @classmethod
    def validate_stock_code(cls, v):
        """Validate stock code format."""
        if not re.match(r'^\d{4}$', v):
            raise ValueError("Stock code must be exactly 4 digits")
        return v


class PriceHistoryRequest(BaseModel):
    """Request model for price history data."""
    
    stock_code: str = Field(..., description="4-digit stock code")
    days: int = Field(default=30, ge=1, le=3650, description="Number of days to retrieve")
    
    @field_validator('stock_code')
    @classmethod
    def validate_stock_code(cls, v):
        """Validate stock code format."""
