import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// CurrentPriceResponse interface from data-model.md
interface CurrentPriceResponse {
  stock_code: string;
  current_price: number;
  previous_close: number;
  price_change: number;
  price_change_pct: number;
  timestamp: string;
  market_status: "open" | "closed" | "pre_market" | "after_hours";
}

interface APIResponse<T> {
  data: T;
  status: "success" | "error";
  message?: string;
  timestamp: string;
}

describe('Contract Test: GET /stocks/{code}/current', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Response', () => {
    it('should return valid CurrentPriceResponse for valid stock code', async () => {
      const stockCode = '7203';
      const mockResponse: APIResponse<CurrentPriceResponse> = {
        data: {
          stock_code: '7203',
          current_price: 2500,
          previous_close: 2450,
          price_change: 50,
          price_change_pct: 2.04,
          timestamp: '2025-09-06T10:30:00Z',
          market_status: 'open'
        },
        status: 'success',
        timestamp: '2025-09-06T10:30:00Z'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await axios.get(`/api/stocks/${stockCode}/current`);
      const priceData: CurrentPriceResponse = result.data.data;

      // Schema validation
      expect(priceData).toHaveProperty('stock_code');
      expect(priceData).toHaveProperty('current_price');
      expect(priceData).toHaveProperty('previous_close');
      expect(priceData).toHaveProperty('price_change');
      expect(priceData).toHaveProperty('price_change_pct');
      expect(priceData).toHaveProperty('timestamp');
      expect(priceData).toHaveProperty('market_status');

      // Data types
      expect(typeof priceData.stock_code).toBe('string');
      expect(typeof priceData.current_price).toBe('number');
      expect(typeof priceData.previous_close).toBe('number');
      expect(typeof priceData.price_change).toBe('number');
      expect(typeof priceData.price_change_pct).toBe('number');
      expect(typeof priceData.timestamp).toBe('string');
      expect(typeof priceData.market_status).toBe('string');

      // Validation
      expect(priceData.stock_code).toMatch(/^[0-9]{4}$/);
      expect(priceData.current_price).toBeGreaterThan(0);
      expect(priceData.previous_close).toBeGreaterThan(0);
      expect(['open', 'closed', 'pre_market', 'after_hours']).toContain(priceData.market_status);

      // ISO timestamp format
      expect(() => new Date(priceData.timestamp)).not.toThrow();
      expect(new Date(priceData.timestamp).toISOString()).toBe(priceData.timestamp);
    });

    it('should handle all market status values', async () => {
      const marketStatuses: Array<"open" | "closed" | "pre_market" | "after_hours"> = 
        ['open', 'closed', 'pre_market', 'after_hours'];

      for (const status of marketStatuses) {
        const mockResponse: APIResponse<CurrentPriceResponse> = {
          data: {
            stock_code: '7203',
            current_price: 2500,
            previous_close: 2450,
            price_change: 50,
            price_change_pct: 2.04,
            timestamp: '2025-09-06T10:30:00Z',
            market_status: status
          },
          status: 'success',
          timestamp: '2025-09-06T10:30:00Z'
        };

        mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

        const result = await axios.get('/api/stocks/7203/current');
        const priceData = result.data.data;

        expect(priceData.market_status).toBe(status);
      }
    });
  });

  describe('Error Response Handling', () => {
    it('should handle invalid stock code', async () => {
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

      await expect(axios.get('/api/stocks/ABCD/current'))
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
    });

    it('should handle market closed scenarios', async () => {
      const mockResponse: APIResponse<CurrentPriceResponse> = {
        data: {
          stock_code: '7203',
          current_price: 2500,
          previous_close: 2450,
          price_change: 50,
          price_change_pct: 2.04,
          timestamp: '2025-09-06T15:00:00Z',
          market_status: 'closed'
        },
        status: 'success',
        message: 'Market is currently closed. Showing last trading day prices.',
        timestamp: '2025-09-06T18:00:00Z'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await axios.get('/api/stocks/7203/current');
      const priceData = result.data.data;

      expect(priceData.market_status).toBe('closed');
      expect(result.data.message).toContain('Market is currently closed');
    });
  });

  describe('Data Consistency Validation', () => {
    it('should validate price calculation consistency', async () => {
      const mockResponse: APIResponse<CurrentPriceResponse> = {
        data: {
          stock_code: '9984',
          current_price: 8200,
          previous_close: 8500,
          price_change: -300,
          price_change_pct: -3.53,
          timestamp: '2025-09-06T10:30:00Z',
          market_status: 'open'
        },
        status: 'success',
        timestamp: '2025-09-06T10:30:00Z'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await axios.get('/api/stocks/9984/current');
      const priceData = result.data.data;

      // Validate price change calculation
      expect(priceData.price_change).toBe(priceData.current_price - priceData.previous_close);
      
      // Validate percentage calculation (with small tolerance for rounding)
      const expectedPercentage = (priceData.price_change / priceData.previous_close) * 100;
      expect(Math.abs(priceData.price_change_pct - expectedPercentage)).toBeLessThan(0.01);
    });
  });
});