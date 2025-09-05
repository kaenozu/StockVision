import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { StockApiError, ValidationError } from '../../src/services/stockApi'

/**
 * Contract Test: GET /stocks/{code}/history
 *
 * This test verifies the API contract for price history retrieval.
 * It uses a mocked axios instance to simulate API responses.
 */

describe('Contract: GET /stocks/{code}/history', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Success Cases', () => {
    it('should return valid PriceHistoryItem array for valid stock code', async () => {
      const expectedHistory = [
        {
          date: '2025-09-04',
          open: 2550.0,
          high: 2590.0,
          low: 2540.0,
          close: 2580.0,
          volume: 1250000,
          stock_code: '7203',
        },
      ]
      vi.mocked(axios.get).mockResolvedValue({ data: expectedHistory, status: 200, statusText: 'OK', headers: {}, config: {}, request: {} })

      const { stockApi } = await import('../../src/services/stockApi')
      const result = await stockApi.getPriceHistory('7203', 30)

      expect(axios.get).toHaveBeenCalledWith(
        '/stocks/7203/history',
        { params: { days: 30 } }
      )
      expect(result).toEqual(expectedHistory)
    })

    it('should handle days parameter correctly', async () => {
        const { stockApi } = await import('../../src/services/stockApi')
        vi.mocked(axios.get).mockResolvedValue({ data: [] })
        await stockApi.getPriceHistory('7203', 90)
        expect(axios.get).toHaveBeenCalledWith(
            '/stocks/7203/history',
            { params: { days: 90 } }
        )
    })
  })

  describe('Validation Cases', () => {
    it('should reject invalid stock code format', async () => {
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getPriceHistory('123', 30)).rejects.toThrow(ValidationError)
    })

    it('should validate days parameter range', async () => {
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getPriceHistory('7203', 0)).rejects.toThrow(ValidationError)
      await expect(stockApi.getPriceHistory('7203', 366)).rejects.toThrow(ValidationError)
    })

    it('should handle non-existent stock code (404)', async () => {
      const apiError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Stock not found' },
        },
      }
      vi.mocked(axios.get).mockRejectedValue(apiError)
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getPriceHistory('0000', 30)).rejects.toThrow(StockApiError)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network Error'))
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getPriceHistory('7203', 30)).rejects.toThrow(StockApiError)
    })

    it('should handle server errors (500)', async () => {
      const apiError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      }
      vi.mocked(axios.get).mockRejectedValue(apiError)
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getPriceHistory('7203', 30)).rejects.toThrow(StockApiError)
    })

    it('should handle empty history data', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: [] })
        const { stockApi } = await import('../../src/services/stockApi')
        const result = await stockApi.getPriceHistory('7203', 30)
        expect(result).toEqual([])
    })
  })

  describe('Data Type Validation', () => {
    it('should throw ValidationError for invalid data type in response', async () => {
        const invalidData = [{ date: 'invalid-date' }]
        vi.mocked(axios.get).mockResolvedValue({ data: invalidData });
        const { stockApi } = await import('../../src/services/stockApi')
        await expect(stockApi.getPriceHistory('7203', 30)).rejects.toThrow(ValidationError)
    })
  })
})
