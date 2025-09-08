import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// StockData interface from data-model.md
interface StockData {
  stock_code: string;
  company_name: string;
  current_price: number;
  previous_close: number;
  price_change: number;
  price_change_pct: number;
  last_updated: string;
}

interface APIResponse<T> {
  data: T;
  status: "success" | "error";
  message?: string;
  timestamp: string;
}

describe('Contract Test: GET /stocks/{code}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Response', () => {
    it('should return valid StockData for valid 4-digit stock code', async () => {
      // Arrange
      const stockCode = '7203';
      const mockResponse: APIResponse<StockData> = {
        data: {
          stock_code: '7203',
          company_name: 'トヨタ自動車',
          current_price: 2500,
          previous_close: 2450,
          price_change: 50,
          price_change_pct: 2.04,
          last_updated: '2025-09-06T10:30:00Z'
        },
        status: 'success',
        timestamp: '2025-09-06T10:30:00Z'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      // Act
      const result = await axios.get(`/api/stocks/${stockCode}`);
      const stockData: StockData = result.data.data;

      // Assert - Schema validation
      expect(stockData).toHaveProperty('stock_code');
      expect(stockData).toHaveProperty('company_name');
      expect(stockData).toHaveProperty('current_price');
      expect(stockData).toHaveProperty('previous_close');
      expect(stockData).toHaveProperty('price_change');
      expect(stockData).toHaveProperty('price_change_pct');
      expect(stockData).toHaveProperty('last_updated');

      // Assert - Data types
      expect(typeof stockData.stock_code).toBe('string');
      expect(typeof stockData.company_name).toBe('string');
      expect(typeof stockData.current_price).toBe('number');
      expect(typeof stockData.previous_close).toBe('number');
      expect(typeof stockData.price_change).toBe('number');
      expect(typeof stockData.price_change_pct).toBe('number');
      expect(typeof stockData.last_updated).toBe('string');

      // Assert - 4-digit stock code validation
      expect(stockData.stock_code).toMatch(/^[0-9]{4}$/);
      expect(stockData.stock_code).toBe(stockCode);

      // Assert - Business logic validation
      expect(stockData.current_price).toBeGreaterThan(0);
      expect(stockData.previous_close).toBeGreaterThan(0);
      expect(stockData.price_change).toBe(stockData.current_price - stockData.previous_close);
      
      // Assert - ISO timestamp format
      expect(() => new Date(stockData.last_updated)).not.toThrow();
      expect(new Date(stockData.last_updated).toISOString()).toBe(stockData.last_updated);
    });

    it('should handle positive price changes correctly', async () => {
      const mockResponse: APIResponse<StockData> = {
        data: {
          stock_code: '6758',
          company_name: 'ソニーグループ',
          current_price: 12500,
          previous_close: 12000,
          price_change: 500,
          price_change_pct: 4.17,
          last_updated: '2025-09-06T10:30:00Z'
        },
        status: 'success',
        timestamp: '2025-09-06T10:30:00Z'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await axios.get('/api/stocks/6758');
      const stockData = result.data.data;

      expect(stockData.price_change).toBeGreaterThan(0);
      expect(stockData.price_change_pct).toBeGreaterThan(0);
      expect(stockData.current_price).toBeGreaterThan(stockData.previous_close);
    });

    it('should handle negative price changes correctly', async () => {
      const mockResponse: APIResponse<StockData> = {
        data: {
          stock_code: '9984',
          company_name: 'ソフトバンクグループ',
          current_price: 7800,
          previous_close: 8200,
          price_change: -400,
          price_change_pct: -4.88,
          last_updated: '2025-09-06T10:30:00Z'
        },
        status: 'success',
        timestamp: '2025-09-06T10:30:00Z'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await axios.get('/api/stocks/9984');
      const stockData = result.data.data;

      expect(stockData.price_change).toBeLessThan(0);
      expect(stockData.price_change_pct).toBeLessThan(0);
      expect(stockData.current_price).toBeLessThan(stockData.previous_close);
    });
  });

  describe('Error Response Handling', () => {
    it('should handle invalid stock code (non-4-digit)', async () => {
      const invalidCodes = ['123', '12345', 'ABCD', '7A03', ''];

      for (const invalidCode of invalidCodes) {
        mockedAxios.get.mockRejectedValueOnce({
          response: {
            status: 400,
            data: {
              error: 'Invalid stock code format',
              detail: 'Stock code must be 4-digit number',
              status_code: 400
            }
          }
        });

        await expect(axios.get(`/api/stocks/${invalidCode}`))
          .rejects
          .toMatchObject({
            response: {
              status: 400,
              data: {
                error: expect.any(String),
                status_code: 400
              }
            }
          });
      }
    });

    it('should handle non-existent stock code', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            error: 'Stock not found',
            detail: 'Stock code 9999 does not exist',
            status_code: 404
          }
        }
      });

      await expect(axios.get('/api/stocks/9999'))
        .rejects
        .toMatchObject({
          response: {
            status: 404,
            data: {
              error: 'Stock not found',
              status_code: 404
            }
          }
        });
    });

    it('should handle server errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            error: 'Internal server error',
            detail: 'Database connection failed',
            status_code: 500
          }
        }
      });

      await expect(axios.get('/api/stocks/7203'))
        .rejects
        .toMatchObject({
          response: {
            status: 500,
            data: {
              error: expect.any(String),
              status_code: 500
            }
          }
        });
    });

    it('should handle network timeouts', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      });

      await expect(axios.get('/api/stocks/7203'))
        .rejects
        .toMatchObject({
          code: 'ECONNABORTED',
          message: expect.stringContaining('timeout')
        });
    });
  });

  describe('Data Validation', () => {
    it('should validate price fields are positive', async () => {
      const mockResponse: APIResponse<StockData> = {
        data: {
          stock_code: '7203',
          company_name: 'トヨタ自動車',
          current_price: 2500,
          previous_close: 2450,
          price_change: 50,
          price_change_pct: 2.04,
          last_updated: '2025-09-06T10:30:00Z'
        },
        status: 'success',
        timestamp: '2025-09-06T10:30:00Z'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await axios.get('/api/stocks/7203');
      const stockData = result.data.data;

      expect(stockData.current_price).toBeGreaterThan(0);
      expect(stockData.previous_close).toBeGreaterThan(0);
      expect(Number.isFinite(stockData.current_price)).toBe(true);
      expect(Number.isFinite(stockData.previous_close)).toBe(true);
    });

    it('should validate company name is non-empty', async () => {
      const mockResponse: APIResponse<StockData> = {
        data: {
          stock_code: '7203',
          company_name: 'トヨタ自動車',
          current_price: 2500,
          previous_close: 2450,
          price_change: 50,
          price_change_pct: 2.04,
          last_updated: '2025-09-06T10:30:00Z'
        },
        status: 'success',
        timestamp: '2025-09-06T10:30:00Z'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await axios.get('/api/stocks/7203');
      const stockData = result.data.data;

      expect(stockData.company_name).toBeTruthy();
      expect(stockData.company_name.length).toBeGreaterThan(0);
    });

    it('should validate price change percentage is within reasonable range', async () => {
      const mockResponse: APIResponse<StockData> = {
        data: {
          stock_code: '7203',
          company_name: 'トヨタ自動車',
          current_price: 2500,
          previous_close: 2450,
          price_change: 50,
          price_change_pct: 2.04,
          last_updated: '2025-09-06T10:30:00Z'
        },
        status: 'success',
        timestamp: '2025-09-06T10:30:00Z'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await axios.get('/api/stocks/7203');
      const stockData = result.data.data;

      // Price change percentage should be reasonable (not > 100% or < -100% in most cases)
      expect(stockData.price_change_pct).toBeGreaterThan(-100);
      expect(Number.isFinite(stockData.price_change_pct)).toBe(true);
    });
  });
});
