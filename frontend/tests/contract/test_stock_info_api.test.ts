import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { StockApiError, ValidationError } from '../../src/services/stockApi'

/**
 * Contract Test: GET /stocks/{code}
 *
 * This test verifies the API contract for stock information retrieval.
 * It uses a mocked axios instance to simulate API responses.
 */

describe('Contract: GET /stocks/{code}', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Success Cases', () => {
    it('should return valid StockData for valid stock code', async () => {
      const expectedStockData = {
        stock_code: '7203',
        company_name: 'トヨタ自動車株式会社',
        current_price: 2580.0,
        previous_close: 2550.0,
        price_change: 30.0,
        price_change_pct: 1.18,
        last_updated: new Date().toISOString(),
      }
      vi.mocked(axios.get).mockResolvedValue({ data: expectedStockData, status: 200, statusText: 'OK', headers: {}, config: {}, request: {} })

      const { stockApi } = await import('../../src/services/stockApi')
      const result = await stockApi.getStockData('7203')

      expect(axios.get).toHaveBeenCalledWith('/stocks/7203', { params: {} })
      expect(result).toEqual(expectedStockData)
    })

    it('should handle use_real_data parameter', async () => {
      const mockData = { stock_code: '7203', company_name: 'トヨタ自動車' }
      vi.mocked(axios.get).mockResolvedValue({ data: mockData })

      const { stockApi } = await import('../../src/services/stockApi')
      await stockApi.getStockData('7203', true)

      expect(axios.get).toHaveBeenCalledWith(
        '/stocks/7203',
        { params: { use_real_data: true } }
      )
    })
  })

  describe('Validation Cases', () => {
    it('should reject invalid stock code format', async () => {
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getStockData('123')).rejects.toThrow(ValidationError)
    })

    it('should handle non-existent stock code (404)', async () => {
      vi.mocked(axios.get).mockRejectedValue({ response: apiError.response, isAxiosError: true, config: {}, name: 'AxiosError', message: 'Request failed with status code ' + apiError.response.status, stack: '' })
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getStockData('0000')).rejects.toThrow(StockApiError)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network Error'))
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getStockData('7203')).rejects.toThrow(StockApiError)
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
      await expect(stockApi.getStockData('7203')).rejects.toThrow(StockApiError)
    })
  })

  describe('Data Type Validation', () => {
    it('should throw ValidationError for invalid data type in response', async () => {
      const invalidData = { stock_code: '7203', company_name: 12345 }
      vi.mocked(axios.get).mockResolvedValue({ data: invalidData })
      const { stockApi } = await import('../../src/services/stockApi')
      await expect(stockApi.getStockData('7203')).rejects.toThrow(ValidationError)
    })
  })
})
