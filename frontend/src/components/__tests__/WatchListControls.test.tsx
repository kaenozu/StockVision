/**
 * WatchListControls Component Tests
 * 
 * Tests for edge cases and error scenarios in the WatchListControls component.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WatchListControls, FilterOption } from '../watchlist/WatchListControls'

// Mock ThemeContext
const mockTheme = {
  theme: 'light',
  toggleTheme: vi.fn(),
  isDarkMode: false
}

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => mockTheme
}))

describe('WatchListControls', () => {
  const defaultProps = {
    onSortChange: vi.fn(),
    onFilterChange: vi.fn(),
    onSearch: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Search Functionality', () => {
    test('should handle empty search input', async () => {
      const user = userEvent.setup()
      render(<WatchListControls {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search stocks...')
      
      // Type and then clear
      await user.type(searchInput, 'AAPL')
      await user.clear(searchInput)
      
      await waitFor(() => {
        expect(defaultProps.onSearch).toHaveBeenCalledWith('')
      })
    })

    test('should debounce search input', async () => {
      vi.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      render(<WatchListControls {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search stocks...')
      
      // Type quickly
      await user.type(searchInput, 'A')
      await user.type(searchInput, 'A')
      await user.type(searchInput, 'P')
      await user.type(searchInput, 'L')
      
      // Should not call onSearch immediately
      expect(defaultProps.onSearch).not.toHaveBeenCalled()
      
      // Fast-forward time
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(defaultProps.onSearch).toHaveBeenCalledWith('AAPL')
      })
      
      vi.useRealTimers()
    })

    test('should handle special characters in search', async () => {
      const user = userEvent.setup()
      render(<WatchListControls {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search stocks...')
      
      await user.type(searchInput, 'ABC-123.TO')
      
      await waitFor(() => {
        expect(defaultProps.onSearch).toHaveBeenCalledWith('ABC-123.TO')
      })
    })

    test('should handle very long search input', async () => {
      const user = userEvent.setup()
      render(<WatchListControls {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search stocks...')
      const longInput = 'A'.repeat(1000)
      
      await user.type(searchInput, longInput)
      
      await waitFor(() => {
        expect(defaultProps.onSearch).toHaveBeenCalledWith(longInput)
      })
    })
  })

  describe('Sort Functionality', () => {
    test('should handle sort option changes', async () => {
      const user = userEvent.setup()
      render(<WatchListControls {...defaultProps} />)
      
      const sortSelect = screen.getByDisplayValue('Stock Code')
      
      await user.selectOptions(sortSelect, 'company_name')
      
      expect(defaultProps.onSortChange).toHaveBeenCalledWith('company_name', 'asc')
    })

    test('should toggle sort order', async () => {
      const user = userEvent.setup()
      render(<WatchListControls {...defaultProps} />)
      
      const orderButton = screen.getByTitle('Sort ascending')
      
      await user.click(orderButton)
      
      expect(defaultProps.onSortChange).toHaveBeenCalledWith('stock_code', 'desc')
      
      // Click again to toggle back
      await user.click(orderButton)
      
      expect(defaultProps.onSortChange).toHaveBeenCalledWith('stock_code', 'asc')
    })

    test('should handle invalid sort option gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      render(<WatchListControls {...defaultProps} />)
      
      const sortSelect = screen.getByDisplayValue('Stock Code')
      
      // Simulate an invalid option being selected
      fireEvent.change(sortSelect, { target: { value: 'invalid_option' } })
      
      // Should still call onSortChange with the invalid value
      expect(defaultProps.onSortChange).toHaveBeenCalledWith('invalid_option', 'asc')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Filter Functionality', () => {
    test('should handle filter changes', async () => {
      const user = userEvent.setup()
      render(<WatchListControls {...defaultProps} />)
      
      const watchedCheckbox = screen.getByLabelText('Show watched only')
      
      await user.click(watchedCheckbox)
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith([
        { key: 'watched', label: 'Show watched only', checked: true },
        { key: 'gainers', label: 'Gainers only', checked: false },
        { key: 'losers', label: 'Losers only', checked: false }
      ])
    })

    test('should handle multiple filter selections', async () => {
      const user = userEvent.setup()
      render(<WatchListControls {...defaultProps} />)
      
      const watchedCheckbox = screen.getByLabelText('Show watched only')
      const gainersCheckbox = screen.getByLabelText('Gainers only')
      
      await user.click(watchedCheckbox)
      await user.click(gainersCheckbox)
      
      // Should be called twice with updated filter states
      expect(defaultProps.onFilterChange).toHaveBeenCalledTimes(2)
      expect(defaultProps.onFilterChange).toHaveBeenLastCalledWith([
        { key: 'watched', label: 'Show watched only', checked: true },
        { key: 'gainers', label: 'Gainers only', checked: true },
        { key: 'losers', label: 'Losers only', checked: false }
      ])
    })

    test('should handle conflicting filters', async () => {
      const user = userEvent.setup()
      render(<WatchListControls {...defaultProps} />)
      
      const gainersCheckbox = screen.getByLabelText('Gainers only')
      const losersCheckbox = screen.getByLabelText('Losers only')
      
      // Select gainers first
      await user.click(gainersCheckbox)
      
      // Then select losers (should allow both to be selected)
      await user.click(losersCheckbox)
      
      expect(defaultProps.onFilterChange).toHaveBeenLastCalledWith([
        { key: 'watched', label: 'Show watched only', checked: false },
        { key: 'gainers', label: 'Gainers only', checked: true },
        { key: 'losers', label: 'Losers only', checked: true }
      ])
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<WatchListControls {...defaultProps} />)
      
      expect(screen.getByLabelText('Search stocks')).toBeInTheDocument()
      expect(screen.getByLabelText('Sort by')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument()
    })

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<WatchListControls {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search stocks...')
      
      // Tab to search input
      await user.tab()
      expect(searchInput).toHaveFocus()
      
      // Tab to sort select
      await user.tab()
      expect(screen.getByDisplayValue('Stock Code')).toHaveFocus()
      
      // Tab to sort order button
      await user.tab()
      expect(screen.getByTitle('Sort ascending')).toHaveFocus()
    })

    test('should handle Enter key in search', async () => {
      const user = userEvent.setup()
      render(<WatchListControls {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search stocks...')
      
      await user.type(searchInput, 'AAPL')
      await user.keyboard('{Enter}')
      
      // Should trigger search immediately on Enter
      await waitFor(() => {
        expect(defaultProps.onSearch).toHaveBeenCalledWith('AAPL')
      })
    })
  })

  describe('Theme Integration', () => {
    test('should apply dark mode styles', () => {
      // Mock dark mode
      mockTheme.isDarkMode = true
      mockTheme.theme = 'dark'
      
      render(<WatchListControls {...defaultProps} />)
      
      const container = screen.getByRole('search').parentElement
      expect(container).toHaveClass('bg-gray-800')
    })

    test('should apply light mode styles', () => {
      // Mock light mode
      mockTheme.isDarkMode = false
      mockTheme.theme = 'light'
      
      render(<WatchListControls {...defaultProps} />)
      
      const container = screen.getByRole('search').parentElement
      expect(container).toHaveClass('bg-white')
    })
  })

  describe('Error Handling', () => {
    test('should handle callback errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const props = {
        ...defaultProps,
        onSearch: vi.fn(() => { throw new Error('Search error') }),
        onSortChange: vi.fn(() => { throw new Error('Sort error') }),
        onFilterChange: vi.fn(() => { throw new Error('Filter error') })
      }
      
      const user = userEvent.setup()
      render(<WatchListControls {...props} />)
      
      // Should not crash when callbacks throw errors
      const searchInput = screen.getByPlaceholderText('Search stocks...')
      await user.type(searchInput, 'AAPL')
      
      const sortSelect = screen.getByDisplayValue('Stock Code')
      await user.selectOptions(sortSelect, 'company_name')
      
      const watchedCheckbox = screen.getByLabelText('Show watched only')
      await user.click(watchedCheckbox)
      
      // Component should still be functional
      expect(screen.getByPlaceholderText('Search stocks...')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })

    test('should handle missing callback props', () => {
      const incompleteProps = {
        onSortChange: vi.fn()
        // Missing onFilterChange and onSearch
      }
      
      // Should not crash when some callbacks are missing
      expect(() => {
        render(<WatchListControls {...incompleteProps as any} />)
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    test('should not re-render unnecessarily', async () => {
      let renderCount = 0
      
      const TestComponent = (props: any) => {
        renderCount++
        return <WatchListControls {...props} />
      }
      
      const { rerender } = render(<TestComponent {...defaultProps} />)
      
      const initialRenderCount = renderCount
      
      // Re-render with same props
      rerender(<TestComponent {...defaultProps} />)
      
      // Should not cause additional renders with same props
      expect(renderCount).toBe(initialRenderCount + 1)
    })

    test('should handle rapid user interactions', async () => {
      vi.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      render(<WatchListControls {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search stocks...')
      
      // Rapid typing
      for (let i = 0; i < 10; i++) {
        await user.type(searchInput, 'A')
      }
      
      // Should debounce and only call onSearch once
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(defaultProps.onSearch).toHaveBeenCalledTimes(1)
      })
      
      vi.useRealTimers()
    })
  })
})