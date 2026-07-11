'use client'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import { App, ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import type { FC, PropsWithChildren } from 'react'
import { BRAND, INK, RADIUS, BG, SEMANTIC } from '@/lib/utils/designTokens'

/**
 * Ant Design v5 全局 Provider · v2
 *
 * 应用 2+3 混合视觉规范：
 * - 主色 `#8b5cf6` (brand-500 紫) + 强调 `#f472b6` (accent-400 粉)
 * - 状态色 (success/warning/danger/info) 走 v2 语义
 * - 圆角改大 (md: 10, lg: 12)
 * - 字体: Outfit + Noto Sans SC
 * - 关闭 antd 默认阴影 + bodyBg 透明 (让 Bento canvas 透出)
 *
 * 完整规范见 docs/style-guide.md v2
 */
const AntdProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <AntdRegistry>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: BRAND[500],
            colorInfo: SEMANTIC.info,
            colorSuccess: SEMANTIC.success,
            colorWarning: SEMANTIC.warning,
            colorError: SEMANTIC.danger,

            colorText: INK[900],
            colorTextSecondary: INK[700],
            colorTextTertiary: INK[500],
            colorTextQuaternary: INK[300],

            colorBorder: INK[100],
            colorBorderSecondary: INK[50],

            colorBgContainer: BG.panel,
            colorBgLayout: 'transparent',  // 关键: 让 Bento canvas 透出
            colorBgElevated: BG.panel,

            borderRadius: RADIUS.lg,        // 10px
            borderRadiusLG: RADIUS.xl,      // 12px
            borderRadiusSM: RADIUS.sm,      // 6px

            fontFamily: "var(--font-outfit), var(--font-noto-sc), system-ui, sans-serif",
            fontSize: 14,

            // 关闭 antd 默认阴影（用 globals.css 自定义 .bento-card 系列）
            boxShadow: 'none',
            boxShadowSecondary: 'none',
            wireframe: false,
          },
          components: {
            Button: {
              borderRadius: RADIUS.xl,        // 12px
              controlHeight: 40,
              fontWeight: 500,
              primaryShadow: 'none',
              defaultShadow: 'none',
            },
            Card: {
              borderRadiusLG: RADIUS['2xl'],  // 18px (Bento)
              paddingLG: 24,
            },
            Modal: {
              borderRadiusLG: RADIUS['3xl'],  // 20px (Glass)
            },
            Table: {
              borderRadiusLG: RADIUS['2xl'],
              headerBg: 'rgba(237, 233, 254, 0.3)',  // 极淡 brand-100
              headerColor: INK[500],
              headerSortActiveBg: 'transparent',
              headerSortHoverBg: 'transparent',
              rowHoverBg: 'rgba(139, 92, 246, 0.04)',  // 极淡 brand-500
              cellPaddingBlock: 16,
              cellPaddingInline: 24,
            },
            Tabs: {
              itemSelectedColor: BRAND[600],
              inkBarColor: BRAND[500],
              titleFontSize: 14,
            },
            Input: {
              borderRadius: RADIUS.lg,        // 10px
              controlHeight: 40,
            },
            Select: {
              borderRadius: RADIUS.lg,
              controlHeight: 40,
            },
            DatePicker: {
              borderRadius: RADIUS.lg,
              controlHeight: 40,
            },
            Layout: {
              bodyBg: 'transparent',
              headerBg: 'transparent',
              siderBg: 'transparent',
              footerBg: 'transparent',
            },
            Menu: {
              itemBg: 'transparent',
              itemSelectedBg: 'rgba(139, 92, 246, 0.10)',
              itemSelectedColor: BRAND[600],
              itemHoverBg: 'rgba(139, 92, 246, 0.05)',
              itemBorderRadius: 8,
            },
          },
          algorithm: theme.defaultAlgorithm,
        }}
      >
        <App message={{ maxCount: 3 }}>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  )
}

export default AntdProvider
