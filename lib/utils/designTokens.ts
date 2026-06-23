/**
 * UART 设计令牌（Design Tokens）
 *
 * 完整规范见 docs/style-guide.md
 * 颜色取自 CSS 变量（globals.css），通过 getComputedStyle 在运行时读取；
 * 这里只导出静态映射，给组件直接引用（避免运行时解析）。
 *
 * ⚠️ 改 token 必须同时改 globals.css 和本文件
 */

export const BRAND = {
  start: '#6366f1',
  end:   '#06b6d4',
  gradient: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
} as const

export const INK = {
  900: '#0f172a',
  700: '#334155',
  500: '#64748b',
  300: '#cbd5e1',
  100: '#f1f5f9',
  50:  '#f8fafc',
} as const

export const SEMANTIC = {
  primary: '#6366f1',
  success: '#059669',
  warning: '#d97706',
  danger:  '#dc2626',
  info:    '#06b6d4',
  purple:  '#7c3aed',
} as const

export const BG = {
  page:  '#fafbfc',
  panel: '#ffffff',
  hover: '#fafbfc',
} as const

export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
} as const

export const SHADOW = {
  card:  '0 1px 3px rgba(15,23,42,.04), 0 1px 2px rgba(15,23,42,.06)',
  hover: '0 10px 25px rgba(99,102,241,.1), 0 4px 10px rgba(15,23,42,.06)',
  btn:   '0 8px 20px rgba(99,102,241,.3)',
} as const

export const FONT = {
  family: '"Inter", "PingFang SC", -apple-system, system-ui, sans-serif',
  sizes: {
    xs:   11,
    sm:   12,
    base: 14,
    md:   16,
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 30,
  },
} as const

export type SummaryVariant = keyof typeof SEMANTIC

/** antd Statistic 等组件的 segment color */
export const VARIANT_TO_TAILWIND_BG: Record<SummaryVariant, string> = {
  primary: '#eef2ff',
  success: '#ecfdf5',
  warning: '#fffbeb',
  danger:  '#fef2f2',
  info:    '#ecfeff',
  purple:  '#f5f3ff',
}