import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import contexts that don't exist yet - this MUST fail
import { AccessibilityProvider } from '../../src/contexts/AccessibilityContext'
import { ThemeProvider } from '../../src/contexts/ThemeContext'
import { StockCard } from '../../src/components/StockCard'

expect.extend(toHaveNoViolations)

// Test app with keyboard navigation
const KeyboardNavigationApp = () => {
  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <div data-testid="app-container">
          <header data-testid="header">
            <button data-testid="theme-toggle" className="theme-toggle">
              テーマ切り替え
            </button>
            <input 
              data-testid="search-input" 
              type="text" 
              placeholder="銘柄コード検索"
              aria-label="銘柄コード検索"
            />
            <button data-testid="search-button">検索</button>
          </header>
          
          <nav data-testid="navigation" role="navigation">
            <a href="#home" data-testid="nav-home">ホーム</a>
            <a href="#portfolio" data-testid="nav-portfolio">ポートフォリオ</a>
            <a href="#watchlist" data-testid="nav-watchlist">ウォッチリスト</a>
          </nav>

          <main data-testid="main-content">
            <div data-testid="stock-list" role="list">
              <StockCard 
                stockCode="7203"
                name="トヨタ自動車"
                price={2500}
                previousPrice={2400}
                accessibility={{
                  ariaLabel: "トヨタ自動車 7203番 現在価格2500円",
                  keyboardNavigation: true
                }}
                data-testid="stock-card-1"
              />
              <StockCard 
                stockCode="6758"
                name="ソニー"
                price={12000}
                previousPrice={11800}
                accessibility={{
                  ariaLabel: "ソニー 6758番 現在価格12000円",
                  keyboardNavigation: true
                }}
                data-testid="stock-card-2"
              />
            </div>
          </main>

          <div data-testid="modal" role="dialog" aria-hidden="true">
            <button data-testid="modal-close">閉じる</button>
            <button data-testid="modal-confirm">確認</button>
          </div>
        </div>
      </AccessibilityProvider>
    </ThemeProvider>
  )
}

describe('Keyboard Navigation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.focus() // Reset focus
  })

  it('should have logical tab order through interface', async () => {
    render(<KeyboardNavigationApp />)

    const themeToggle = screen.getByTestId('theme-toggle')
    const searchInput = screen.getByTestId('search-input')
    const searchButton = screen.getByTestId('search-button')
    const navHome = screen.getByTestId('nav-home')
    const stockCard1 = screen.getByTestId('stock-card-1')

    // Start tabbing from beginning
    act(() => {
      fireEvent.keyDown(document.body, { key: 'Tab' })
    })
    expect(themeToggle).toHaveFocus()

    act(() => {
      fireEvent.keyDown(themeToggle, { key: 'Tab' })
    })
    expect(searchInput).toHaveFocus()

    act(() => {
      fireEvent.keyDown(searchInput, { key: 'Tab' })
    })
    expect(searchButton).toHaveFocus()

    act(() => {
      fireEvent.keyDown(searchButton, { key: 'Tab' })
    })
    expect(navHome).toHaveFocus()

    // Continue to stock cards
    act(() => {
      fireEvent.keyDown(navHome, { key: 'Tab' })
      fireEvent.keyDown(screen.getByTestId('nav-portfolio'), { key: 'Tab' })
      fireEvent.keyDown(screen.getByTestId('nav-watchlist'), { key: 'Tab' })
    })
    expect(stockCard1).toHaveFocus()
  })

  it('should support reverse tab order with Shift+Tab', async () => {
    render(<KeyboardNavigationApp />)

    const stockCard1 = screen.getByTestId('stock-card-1')
    const navWatchlist = screen.getByTestId('nav-watchlist')

    // Focus on stock card first
    act(() => {
      stockCard1.focus()
    })

    // Shift+Tab should go backwards
    act(() => {
      fireEvent.keyDown(stockCard1, { key: 'Tab', shiftKey: true })
    })
    expect(navWatchlist).toHaveFocus()
  })

  it('should activate buttons with Enter key', async () => {
    const onThemeToggle = vi.fn()
    const onSearch = vi.fn()

    render(<KeyboardNavigationApp />)

    const themeToggle = screen.getByTestId('theme-toggle')
    const searchButton = screen.getByTestId('search-button')

    themeToggle.addEventListener('click', onThemeToggle)
    searchButton.addEventListener('click', onSearch)

    // Enter on theme toggle
    act(() => {
      themeToggle.focus()
      fireEvent.keyDown(themeToggle, { key: 'Enter' })
    })
    expect(onThemeToggle).toHaveBeenCalled()

    // Enter on search button
    act(() => {
      searchButton.focus()
      fireEvent.keyDown(searchButton, { key: 'Enter' })
    })
    expect(onSearch).toHaveBeenCalled()
  })

  it('should activate buttons with Space key', async () => {
    const onThemeToggle = vi.fn()

    render(<KeyboardNavigationApp />)

    const themeToggle = screen.getByTestId('theme-toggle')
    themeToggle.addEventListener('click', onThemeToggle)

    act(() => {
      themeToggle.focus()
      fireEvent.keyDown(themeToggle, { key: ' ', code: 'Space' })
    })
    expect(onThemeToggle).toHaveBeenCalled()
  })

  it('should navigate stock cards with arrow keys', async () => {
    render(<KeyboardNavigationApp />)

    const stockCard1 = screen.getByTestId('stock-card-1')
    const stockCard2 = screen.getByTestId('stock-card-2')

    // Focus first stock card
    act(() => {
      stockCard1.focus()
    })

    // Arrow down should move to next card
    act(() => {
      fireEvent.keyDown(stockCard1, { key: 'ArrowDown' })
    })
    expect(stockCard2).toHaveFocus()

    // Arrow up should go back
    act(() => {
      fireEvent.keyDown(stockCard2, { key: 'ArrowUp' })
    })
    expect(stockCard1).toHaveFocus()
  })

  it('should handle Escape key for modal dismissal', async () => {
    render(<KeyboardNavigationApp />)

    const modal = screen.getByTestId('modal')
    const modalClose = screen.getByTestId('modal-close')

    // Open modal (simulate)
    act(() => {
      modal.setAttribute('aria-hidden', 'false')
      modalClose.focus()
    })

    // Escape should close modal
    act(() => {
      fireEvent.keyDown(modalClose, { key: 'Escape' })
    })
    expect(modal).toHaveAttribute('aria-hidden', 'true')
  })

  it('should trap focus within open modal', async () => {
    render(<KeyboardNavigationApp />)

    const modal = screen.getByTestId('modal')
    const modalClose = screen.getByTestId('modal-close')
    const modalConfirm = screen.getByTestId('modal-confirm')

    // Open modal
    act(() => {
      modal.setAttribute('aria-hidden', 'false')
      modalClose.focus()
    })

    // Tab should cycle within modal
    act(() => {
      fireEvent.keyDown(modalClose, { key: 'Tab' })
    })
    expect(modalConfirm).toHaveFocus()

    // Tab again should go back to first element
    act(() => {
      fireEvent.keyDown(modalConfirm, { key: 'Tab' })
    })
    expect(modalClose).toHaveFocus()
  })

  it('should provide clear focus indicators', async () => {
    render(<KeyboardNavigationApp />)

    const themeToggle = screen.getByTestId('theme-toggle')
    
    act(() => {
      themeToggle.focus()
    })

    expect(themeToggle).toHaveClass('focus:outline-focus')
    expect(themeToggle).toHaveClass('focus:ring-2')
  })

  it('should skip disabled elements in tab order', async () => {
    render(<KeyboardNavigationApp />)

    const searchButton = screen.getByTestId('search-button')
    const navHome = screen.getByTestId('nav-home')

    // Disable search button
    searchButton.setAttribute('disabled', 'true')

    const searchInput = screen.getByTestId('search-input')
    
    act(() => {
      searchInput.focus()
      fireEvent.keyDown(searchInput, { key: 'Tab' })
    })

    // Should skip disabled button and go to navigation
    expect(navHome).toHaveFocus()
  })

  it('should handle keyboard shortcuts', async () => {
    render(<KeyboardNavigationApp />)

    const searchInput = screen.getByTestId('search-input')

    // Ctrl+K should focus search (common shortcut)
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    })
    expect(searchInput).toHaveFocus()
  })

  it('should announce keyboard navigation mode activation', async () => {
    render(<KeyboardNavigationApp />)

    const themeToggle = screen.getByTestId('theme-toggle')

    // First Tab should activate keyboard navigation mode
    act(() => {
      fireEvent.keyDown(document, { key: 'Tab' })
    })

    expect(document.body).toHaveClass('keyboard-navigation-active')
    expect(themeToggle).toHaveFocus()
  })

  it('should handle Home and End keys for navigation', async () => {
    render(<KeyboardNavigationApp />)

    const stockCard1 = screen.getByTestId('stock-card-1')
    const stockCard2 = screen.getByTestId('stock-card-2')

    // Focus somewhere in the middle
    act(() => {
      stockCard2.focus()
    })

    // Home key should go to first item
    act(() => {
      fireEvent.keyDown(stockCard2, { key: 'Home' })
    })
    expect(stockCard1).toHaveFocus()

    // End key should go to last item  
    act(() => {
      fireEvent.keyDown(stockCard1, { key: 'End' })
    })
    expect(stockCard2).toHaveFocus()
  })

  it('should maintain accessibility during keyboard navigation', async () => {
    const { container } = render(<KeyboardNavigationApp />)

    // Test with keyboard navigation active
    act(() => {
      fireEvent.keyDown(document, { key: 'Tab' })
    })

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should provide screen reader announcements for navigation', async () => {
    render(<KeyboardNavigationApp />)

    const stockCard1 = screen.getByTestId('stock-card-1')

    act(() => {
      stockCard1.focus()
    })

    // Should have proper ARIA live region for announcements
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should handle international keyboard layouts', async () => {
    render(<KeyboardNavigationApp />)

    const searchInput = screen.getByTestId('search-input')

    // Test Japanese input
    act(() => {
      searchInput.focus()
      fireEvent.change(searchInput, { target: { value: 'トヨタ' } })
      fireEvent.keyDown(searchInput, { key: 'Enter' })
    })

    expect(searchInput.value).toBe('トヨタ')
  })

  it('should work with assistive technology', async () => {
    // Mock screen reader
    Object.defineProperty(navigator, 'userAgent', {
      value: 'NVDA',
      writable: true
    })

    render(<KeyboardNavigationApp />)

    const stockCard1 = screen.getByTestId('stock-card-1')
    
    expect(stockCard1).toHaveAttribute('aria-label')
    expect(stockCard1).toHaveAttribute('role', 'listitem')
  })
})