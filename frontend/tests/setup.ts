import { vi } from 'vitest'
import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'
import { vi } from 'vitest'

// Mock fetch for tests
global.fetch = vi.fn()

// Mock axios for API tests
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    })),
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
  return { default: mockAxios }
})

// Mock window.matchMedia for responsive context tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => {
    const mockMediaQueryList = {
      matches: query === '(prefers-color-scheme: dark)' ? false : query.includes('min-width'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    return mockMediaQueryList
  }),
})

// Mock ResizeObserver for responsive tests
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock localStorage for theme persistence tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Setup test environment
beforeEach(() => {
  vi.resetAllMocks()
  
  // Reset matchMedia mock
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)' ? false : query.includes('min-width'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  
  // Reset ResizeObserver mock
  global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
  
  // Reset localStorage mock
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    writable: true
  })
  
  document.body.focus()
})