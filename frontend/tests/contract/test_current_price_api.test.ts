import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { StockApiError, ValidationError } from '../../src/services/stockApi'

/**
 * Contract Test: GET /stocks/{code}/current
 *
 * This test verifies the API contract for current price retrieval.
 * It uses a mocked axios instance to simulate API responses.
 */

describe('Contract: GET /stocks/{code}/current', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Success Cases', () => {
    it('should return valid CurrentPriceResponse for valid stock code', async () => {
      const expectedCurrentPrice = {
        stock_code: '7203',
        current_price: 2580.0,
        previous_close: 2550.0,
        price_change: 30.0,
        price_change_pct: 1.18,
        timestamp: new Date().toISOString(),
        market_status: 'open' as const,
      }
      vi.mocked(axios.get).mockResolvedValue({ data: expectedCurrentPrice, status: 200, statusText: 'OK', headers: {}, config: {}, request: {} })

      const { stockApi } = await import('../../src/services/stockApi')
      const result = await stockApi.getCurrentPrice('7203')

      expect(axios.get).toHaveBeenCalledWith(
        '/stocks/7203/current',
        { params: {} }
      )
      expect(result).toEqual(expectedCurrentPrice)
    })

    it('should handle use_real_data parameter', async () => {
      const mockData = { stock_code: '7203', current_price: 2580.0, timestamp: new Date().toISOString(), market_status: 'open' as const }
      vi.mocked(axios.get).mockResolvedValue({ data: mockData })

      const { stockApi } = await import('../../src/services/stockApi')
      await stockApi.getCurrentPrice('7203', true)

      expect(axios.get).toHaveBeenCalledWith(
        '/stocks/7203/current',
        { params: { use_real_data: true } }
      )
    })

    it('should handle different market statuses', async () => {
        const marketStatuses = ['open', 'closed', 'pre_market', 'after_hours'] as const
        const { stockApi } = await import('../../src/services/stockApi')

        for (const status of marketStatuses) {
            const mockData = { stock_code: '7203', current_price: 2500, timestamp: new Date().toISOString(), market_status: status }
            vi.mocked(axios.get).mockResolvedValue({ data: mockData })
            const result = await stockApi.getCurrentPrice('7203')
            expect(result.market_status).toBe(status)
        }
    })
  })

  describe('Validation Cases', () => {
    it('should reject invalid stock code format', async () => {
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getCurrentPrice('123')).rejects.toThrow(ValidationError)
      await expect(stockApi.getCurrentPrice('12345')).rejects.toThrow(ValidationError)
      await expect(stockApi.getCurrentPrice('abcd')).rejects.toThrow(ValidationError)
    })

    it('should handle non-existent stock code (404)', async () => {
      vi.mocked(axios.get).mockRejectedValue({ response: apiError.response, isAxiosError: true, config: {}, name: 'AxiosError', message: 'Request failed with status code ' + apiError.response.status, stack: '' })
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getCurrentPrice('0000')).rejects.toThrow(StockApiError)
      await expect(stockApi.getCurrentPrice('0000')).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network Error'))
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getCurrentPrice('7203')).rejects.toThrow(StockApiError)
      await expect(stockApi.getCurrentPrice('7203')).rejects.toMatchObject({ message: 'Network Error' })
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
      await expect(stockApi.getCurrentPrice('7203')).rejects.toThrow(StockApiError)
      await expect(stockApi.getCurrentPrice('7203')).rejects.toMatchObject({ status: 500 })
    })
  })

  describe('Data Type Validation', () => {
    it('should throw ValidationError for invalid data type in response', async () => {
        const invalidData = { stock_code: '7203', current_price: 'not a number' }
        vi.mocked(axios.get).mockResolvedValue({ data: invalidData });
        const { stockApi } = await import('../../src/services/stockApi')
        await expect(stockApi.getCurrentPrice('7203')).rejects.toThrow(ValidationError)
    })
  })
})
