/**
 * UART 设计令牌 v2 · 2+3 混合方案
 *
 * 完整规范见 docs/style-guide.md
 * 颜色取自 CSS 变量（globals.css），通过 getComputedStyle 在运行时读取；
 * 这里只导出静态映射，给组件直接引用（避免运行时解析）。
 *
 * ⚠️ 改 token 必须同时改 globals.css 和本文件
 *
 * 历史版本：
 * - v1 (2026-06, 方案 C 浅色极简 SaaS, brand=#6366f1→#06b6d4 紫青)
 * - v2 (2026-07-11, 2+3 混合, brand=#8b5cf6→#f472b6 紫粉)
 */

// =========================================================================
// 品牌色 (Brand · 紫色系 Bento + Aurora)
// =========================================================================

export const BRAND = {
  50:  '#f5f3ff',
  100: '#ede9fe',
  200: '#ddd6fe',
  300: '#c4b5fd',
  400: '#a78bfa',
  500: '#8b5cf6',  // 主色 (紫)
  600: '#7c3aed',
  700: '#6d28d9',
  800: '#5b21b6',
  900: '#4c1d95',
  950: '#2e1065',
} as const

// =========================================================================
// 强调色 (Accent · 粉色)
// =========================================================================

export const ACCENT = {
  300: '#f9a8d4',
  400: '#f472b6',  // 强调 (粉)
  500: '#ec4899',
} as const

// =========================================================================
// 中性色 (Ink Scale)
// =========================================================================

export const INK = {
  900: '#0f172a',
  700: '#334155',
  500: '#64748b',
  400: '#94a3b8',
  300: '#cbd5e1',
  200: '#e2e8f0',
  100: '#f1f5f9',
  50:  '#f8fafc',
} as const

// =========================================================================
// 语义色 (PageSummary variant 用)
// =========================================================================

export const SEMANTIC = {
  primary: BRAND[500],  // #8b5cf6
  success: '#10b981',
  warning: '#f59e0b',
  danger:  '#f43f5e',
  info:    '#6366f1',   // 复用 brand-600 作 info
} as const

// =========================================================================
// 状态徽章色 (StatusTag variant 用 · 6 种)
// =========================================================================

export const STATUS = {
  online: {
    text:   '#047857',
    bg:     'rgba(16,185,129,0.12)',
    dot:    '#10b981',
    label:  '在线',
  },
  offline: {
    text:   '#be123c',
    bg:     'rgba(244,63,94,0.12)',
    dot:    '#f43f5e',
    label:  '离线',
  },
  warning: {
    text:   '#b45309',
    bg:     'rgba(245,158,11,0.12)',
    dot:    '#f59e0b',
    label:  '告警',
  },
  error: {
    text:   '#be123c',
    bg:     'rgba(244,63,94,0.15)',
    dot:    '#f43f5e',
    label:  '错误',
  },
  info: {
    text:   '#5b21b6',
    bg:     'rgba(139,92,246,0.10)',
    dot:    '#8b5cf6',
    label:  '信息',
  },
  idle: {
    text:   '#475569',
    bg:     'rgba(148,163,184,0.12)',
    dot:    '#94a3b8',
    label:  '闲置',
  },
} as const

export type StatusVariant = keyof typeof STATUS

// =========================================================================
// 背景层 (Background)
// =========================================================================

export const BG = {
  page:  '#fafafa',  // Bento canvas 底色
  panel: '#ffffff',
  hover: '#fafbfc',
  canvas: '#fafafa',  // 同 page
} as const

// =========================================================================
// 圆角 (Radius)
// =========================================================================

export const RADIUS = {
  sm: 6,    // 分割线 / 细线元素
  md: 8,    // 菜单项
  lg: 10,   // 输入框
  xl: 12,   // 主按钮
  '2xl': 18,  // BentoCard 主圆角 (项目主特征)
  '3xl': 20,  // GlassCard 圆角
  '4xl': 24,  // 登录卡
  full: 999,  // Tag / Badge 胶囊
} as const

// =========================================================================
// 阴影 (Shadow)
// =========================================================================

export const SHADOW = {
  // Bento 卡片（轻抬升 + 紫光晕）
  bento:  '0 4px 20px -8px rgba(99, 102, 241, 0.12)',
  // Bento hover（更强紫光）
  bentoHover: '0 8px 30px -8px rgba(99, 102, 241, 0.20)',
  // Glass 卡片（透光感）
  glass: '0 20px 60px -10px rgba(0, 0, 0, 0.2)',
  // 主按钮 glow
  glow: '0 4px 12px -2px rgba(139, 92, 246, 0.4)',
  // 头像 / Logo 浮起
  avatar: '0 4px 12px -2px rgba(139, 92, 246, 0.3)',
} as const

// =========================================================================
// 字体 (Font)
// =========================================================================

export const FONT = {
  sans: "'Outfit', 'Noto Sans SC', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
} as const

// =========================================================================
// 渐变 (Gradient)
// =========================================================================

export const GRADIENT = {
  // Bento 主渐变 (紫 → 粉)
  brand: 'linear-gradient(135deg, #8b5cf6 0%, #f472b6 100%)',
  // Aurora 极光 (深紫 → 紫 → 粉)
  aurora: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #6d28d9 100%)',
  // Bento Canvas 背景 (极光晕染)
  bentoCanvas: `radial-gradient(at 0% 0%, ${BRAND[100]} 0%, transparent 50%),
                 radial-gradient(at 100% 100%, #fce7f3 0%, transparent 50%),
                 ${BG.page}`,
  // Glass Mesh 背景 (4 色渐变 · 登录页用)
  glassMesh: 'linear-gradient(125deg, #3b82f6 0%, #8b5cf6 35%, #ec4899 70%, #f97316 100%)',
  // Glass Light (Bento 上的玻璃装饰)
  glassLight: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(237,233,254,0.4) 100%)',
  // Glass Tinted (粉紫渐变 · 设备操作区)
  glassTinted: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(252,231,243,0.4) 100%)',
} as const

// =========================================================================
// 动效 (Motion)
// =========================================================================

export const MOTION = {
  fast:  '150ms',  // hover / focus
  base:  '250ms',  // 卡片 hover / 页面切换
  slow:  '400ms',  // 玻璃卡透明度渐变
  ease:  'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

// =========================================================================
// 间距 (Spacing · 4px 网格)
// =========================================================================

export const SPACING = {
  cardPaddingBento:  24,    // BentoCard padding
  cardPaddingGlass:  32,    // GlassCard padding
  cardPaddingLogin:  40,    // 登录卡 padding
  pagePadding:       32,    // 页面 padding (p-8)
  sectionGap:        24,    // 章节间距
  cardGap:           20,    // Bento 卡片间距 (gap-5)
  tableCellPadding:  '16px 24px',  // 表格行 padding
  inputPadding:      '10px 16px',  // 输入框 padding
} as const

// =========================================================================
// 字号 (Type Scale)
// =========================================================================

export const TYPE = {
  xs:   11,  // caption, tag
  sm:   12,  // 副标签, 表格内文
  base: 14,  // 正文, 按钮
  md:   16,  // h3, 卡片标题
  lg:   18,  // h2, PageHeader
  xl:   20,  // 区块标题
  '2xl': 24,  // 页面主标题
  '3xl': 32,  // Bento KPI 主数值
  '4xl': 42,  // Hero KPI
  '5xl': 64,  // Aurora Hero 主数值
} as const

// =========================================================================
// 圆点符号 (Dot · 用于 StatusTag 前缀)
// =========================================================================

export const DOT = {
  bullet: '●',  // U+25CF · 状态徽章前缀
  arrow:  '→',  // 操作链接
  check:  '✓',  // 完成态
} as const

// =========================================================================
// 导出所有 token (便于 spread)
// =========================================================================

export const TOKENS = {
  BRAND,
  ACCENT,
  INK,
  SEMANTIC,
  STATUS,
  BG,
  RADIUS,
  SHADOW,
  FONT,
  GRADIENT,
  MOTION,
  SPACING,
  TYPE,
  DOT,
} as const

export default TOKENS

// =========================================================================
// v1 兼容导出（2026-07-11 · Stage A 桥接）
// 旧组件 (PageSummary / StatCard / ErrorBoundary / tableCommon) 仍用 v1 接口
// Stage B 重写时移除这些别名
// =========================================================================

/** @deprecated v1 写法, Stage B 改用 BRAND[500] */
export const BRAND_LEGACY = {
  start: BRAND[500],                          // #8b5cf6
  end: '#06b6d4',                              // v1 渐变终点保留
  gradient: GRADIENT.brand,
}

// 给老代码用: BRAND.start / BRAND.end / BRAND.gradient
// 通过 Object.defineProperty 注入
;(BRAND as any).start = BRAND[500]
;(BRAND as any).end = '#06b6d4'
;(BRAND as any).gradient = GRADIENT.brand

/** @deprecated v1 字体接口 */
export const FONT_LEGACY = {
  family: FONT.sans,
  sizes: {
    xs: 11, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30,
  },
}
;(FONT as any).family = FONT.sans
;(FONT as any).sizes = FONT_LEGACY.sizes

/** v1 RADIUS.xl (= 16) 兼容 (Stage B 移除) */
;(RADIUS as any).xl = RADIUS['2xl']  // 18px (Bento 主圆角, 跟 antd Card 对齐)

/**
 * v1 PageSummary variant 枚举 + Tailwind 背景类映射
 * @deprecated Stage B 重写 PageSummary / StatCard 时移除
 */
export type SummaryVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

export const VARIANT_TO_TAILWIND_BG: Record<SummaryVariant, string> = {
  primary: 'bg-primary-50',
  success: 'bg-success-50',
  warning: 'bg-warning-50',
  danger:  'bg-danger-50',
  info:    'bg-info-50',
  purple:  'bg-purple-50',
}

export const VARIANT_TO_TAILWIND_TEXT: Record<SummaryVariant, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger:  'text-danger',
  info:    'text-info',
  purple:  'text-purple',
}

