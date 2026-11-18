import '@testing-library/jest-dom/vitest'

// jsdom does not implement matchMedia; the responsive sidebar hook needs it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// jsdom does not implement scrollIntoView (used by focus management).
Element.prototype.scrollIntoView ??= () => {}
