import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// jsdom 不实现的 antd 依赖
if (typeof window !== 'undefined') {
  // matchMedia mock（antd 组件需要）
  if (!window.matchMedia) {
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
  }
  // getComputedStyle 在 jsdom 里缺失部分 API
  if (!window.getComputedStyle) {
    // @ts-expect-error - jsdom 缺失时的兜底
    window.getComputedStyle = () => ({ getPropertyValue: () => '' })
  }
}
