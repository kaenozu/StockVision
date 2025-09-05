/**
 * Type Guards Unit Tests
 */
import { describe, it, expect } from 'vitest'
import {
  isValidStockCode,
  isStockData,
  isCurrentPriceResponse,
  isPriceHistoryItem,
  isWatchlistItemAPI,
} from '../../src/types/stock'

describe('Stock Type Guards', () => {
  describe('isValidStockCode', () => {
    it('should validate correct stock codes', () => {
      expect(isValidStockCode('1234')).toBe(true)
      expect(isValidStockCode('7203')).toBe(true)
      expect(isValidStockCode('9999')).toBe(true)
    })

    it('should reject invalid stock codes', () => {
      expect(isValidStockCode('123')).toBe(false)
      expect(isValidStockCode('12345')).toBe(false)
      expect(isValidStockCode('abcd')).toBe(false)
      expect(isValidStockCode('')).toBe(false)
      expect(isValidStockCode('12a3')).toBe(false)
    })
  })

  describe('isStockData', () => {
    const validStockData = {
      stock_code: '7203',
      company_name: 'トヨタ自動車',
      current_price: 2500,
      previous_close: 2480,
      price_change: 20,
      price_change_pct: 0.81,
    }

    it('should validate correct StockData objects', () => {
      expect(isStockData(validStockData)).toBe(true)
    })

    it('should reject null or undefined', () => {
      expect(isStockData(null)).toBe(false)
      expect(isStockData(undefined)).toBe(false)
    })

    it('should reject objects missing required fields', () => {
      const { stock_code, ...withoutStockCode } = validStockData
      expect(isStockData(withoutStockCode)).toBe(false)

      const { company_name, ...withoutCompanyName } = validStockData
      expect(isStockData(withoutCompanyName)).toBe(false)
    })

    it('should reject objects with invalid field types', () => {
      expect(isStockData({
        ...validStockData,
        stock_code: 123 // should be string
      })).toBe(false)

      expect(isStockData({
        ...validStockData,
        current_price: '2500' // should be number
      })).toBe(false)
    })

    it('should reject invalid stock code formats', () => {
      expect(isStockData({
        ...validStockData,
        stock_code: '123' // invalid format
      })).toBe(false)
    })
  })

  describe('isCurrentPriceResponse', () => {
    const validCurrentPrice = {
      stock_code: '7203',
      current_price: 2500,
      previous_close: 2480,
      price_change: 20,
      price_change_pct: 0.81,
      timestamp: '2024-01-01T09:00:00Z',
      market_status: 'open',
    }

    it('should validate correct CurrentPriceResponse objects', () => {
      expect(isCurrentPriceResponse(validCurrentPrice)).toBe(true)
    })

    it('should accept optional market_status', () => {
      const { market_status, ...withoutMarketStatus } = validCurrentPrice
      expect(isCurrentPriceResponse(withoutMarketStatus)).toBe(true)
    })

    it('should reject invalid market_status values', () => {
      expect(isCurrentPriceResponse({
        ...validCurrentPrice,
        market_status: 'invalid_status'
      })).toBe(false)
    })

    it('should reject objects with missing required fields', () => {
      const { timestamp, ...withoutTimestamp } = validCurrentPrice
      expect(isCurrentPriceResponse(withoutTimestamp)).toBe(false)
    })
  })

  describe('isPriceHistoryItem', () => {
    const validHistoryItem = {
      date: '2024-01-01',
      open: 2480,
      high: 2550,
      low: 2450,
      close: 2500,
      volume: 1000000,
      stock_code: '7203',
    }

    it('should validate correct PriceHistoryItem objects', () => {
      expect(isPriceHistoryItem(validHistoryItem)).toBe(true)
    })

    it('should reject invalid date formats', () => {
      expect(isPriceHistoryItem({
        ...validHistoryItem,
        date: '24-01-01' // invalid format
      })).toBe(false)

      expect(isPriceHistoryItem({
        ...validHistoryItem,
        date: '2024-1-1' // invalid format
      })).toBe(false)
    })

    it('should validate OHLC relationships', () => {
      // High should be >= max(open, close)
      expect(isPriceHistoryItem({
        ...validHistoryItem,
        high: 2400 // lower than close
      })).toBe(false)

      // Low should be <= min(open, close)
      expect(isPriceHistoryItem({
        ...validHistoryItem,
        low: 2600 // higher than close
      })).toBe(false)
    })

    it('should reject negative volume', () => {
      expect(isPriceHistoryItem({
        ...validHistoryItem,
        volume: -1000
      })).toBe(false)
    })
  })

  describe('isWatchlistItemAPI', () => {
    const validWatchlistItem = {
      stock_code: '7203',
      company_name: 'トヨタ自動車',
      added_date: '2024-01-01T09:00:00Z',
      alert_price: 2600,
      notes: 'Long term hold',
    }

    it('should validate correct WatchlistItemAPI objects', () => {
      expect(isWatchlistItemAPI(validWatchlistItem)).toBe(true)
    })

    it('should accept null alert_price and notes', () => {
      expect(isWatchlistItemAPI({
        ...validWatchlistItem,
        alert_price: null,
        notes: null,
      })).toBe(true)
    })

    it('should reject invalid date formats', () => {
      expect(isWatchlistItemAPI({
        ...validWatchlistItem,
        added_date: '2024-01-01' // missing time
      })).toBe(false)
    })

    it('should reject negative alert prices', () => {
      expect(isWatchlistItemAPI({
        ...validWatchlistItem,
        alert_price: -100
      })).toBe(false)

      expect(isWatchlistItemAPI({
        ...validWatchlistItem,
        alert_price: 0
      })).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle primitive values', () => {
      expect(isStockData('string')).toBe(false)
      expect(isStockData(123)).toBe(false)
      expect(isStockData(true)).toBe(false)
      expect(isCurrentPriceResponse([])).toBe(false)
    })

    it('should handle empty objects', () => {
      expect(isStockData({})).toBe(false)
      expect(isCurrentPriceResponse({})).toBe(false)
      expect(isPriceHistoryItem({})).toBe(false)
      expect(isWatchlistItemAPI({})).toBe(false)
    })

    it('should handle objects with extra properties', () => {
      const validStockData = {
        stock_code: '7203',
        company_name: 'トヨタ自動車',
        current_price: 2500,
        previous_close: 2480,
        price_change: 20,
        price_change_pct: 0.81,
        extraProperty: 'should be ignored',
      }

      expect(isStockData(validStockData)).toBe(true)
    })
  })
})