import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { StockApiError, ValidationError } from '../../src/services/stockApi'

/**
 * Contract Test: GET/POST/DELETE /watchlist
 *
 * This test verifies the API contract for watchlist CRUD operations.
 * It uses a mocked axios instance to simulate API responses.
 */

describe('Contract: Watchlist CRUD Operations', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /watchlist', () => {
    it('should return valid WatchlistItemAPI array', async () => {
      const expectedWatchlist = [
        { stock_code: '7203', company_name: 'トヨタ自動車株式会社', added_date: new Date().toISOString(), alert_price: 2600.0, notes: 'Notes' },
        { stock_code: '6758', company_name: 'ソニーグループ株式会社', added_date: new Date().toISOString(), alert_price: null, notes: null },
      ]
      vi.mocked(axios.get).mockResolvedValue({ data: expectedWatchlist, status: 200, statusText: 'OK', headers: {}, config: {}, request: {} })

      const { stockApi } = await import('../../src/services/stockApi')
      const result = await stockApi.getWatchlist()

      expect(axios.get).toHaveBeenCalledWith('/watchlist')
      expect(result).toEqual(expectedWatchlist)
    })

    it('should handle empty watchlist', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: [] })
      const { stockApi } = await import('../../src/services/stockApi')
      const result = await stockApi.getWatchlist()
      expect(result).toEqual([])
    })
  })

  describe('POST /watchlist', () => {
    it('should add stock to watchlist with valid data', async () => {
      const requestData = { stock_code: '7203', alert_price: 2600.0, notes: 'Monitor' }
      const expectedResponse = { ...requestData, company_name: 'トヨタ自動車', added_date: new Date().toISOString() }
      vi.mocked(axios.post).mockResolvedValue({ data: expectedResponse })

      const { stockApi } = await import('../../src/services/stockApi')
      const result = await stockApi.addToWatchlist(requestData)

      expect(axios.post).toHaveBeenCalledWith('/watchlist', requestData)
      expect(result).toEqual(expectedResponse)
    })

    it('should reject invalid stock code format', async () => {
      const { stockApi } = await import('../../src/services/stockApi')
      const invalidRequest = { stock_code: '123' }
      await expect(stockApi.addToWatchlist(invalidRequest)).rejects.toThrow(ValidationError)
    })

    it('should handle duplicate stock code (400)', async () => {
        const apiError = { isAxiosError: true, response: { status: 400, data: { message: 'Stock already in watchlist' } } }
        vi.mocked(axios.post).mockRejectedValue({ response: apiError.response, isAxiosError: true, config: {}, name: 'AxiosError', message: 'Request failed with status code ' + apiError.response.status, stack: '' })
        const { stockApi } = await import('../../src/services/stockApi')
        await expect(stockApi.addToWatchlist({ stock_code: '7203' })).rejects.toThrow(StockApiError)
    })
  })

  describe('DELETE /watchlist/{stock_code}', () => {
    it('should remove stock from watchlist successfully', async () => {
      const expectedResponse = { message: 'Stock removed from watchlist' }
      vi.mocked(axios.delete).mockResolvedValue({ data: expectedResponse })

      const { stockApi } = await import('../../src/services/stockApi')
      const result = await stockApi.removeFromWatchlist('7203')

      expect(axios.delete).toHaveBeenCalledWith('/watchlist/7203')
      expect(result).toEqual(expectedResponse)
    })

    it('should handle non-existent stock code (404)', async () => {
        const apiError = { isAxiosError: true, response: { status: 404, data: { message: 'Not found' } } }
        vi.mocked(axios.delete).mockRejectedValue(apiError)
        const { stockApi } = await import('../../src/services/stockApi')
        await expect(stockApi.removeFromWatchlist('9999')).rejects.toThrow(StockApiError)
    })
  })
})
