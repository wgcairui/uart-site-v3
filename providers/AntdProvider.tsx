'use client'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import type { FC, PropsWithChildren } from 'react'
import { BRAND, INK, RADIUS, FONT, BG } from '@/lib/utils/designTokens'

/**
 * Ant Design v5 全局 Provider
 *
 * 应用方案 C 视觉规范：
 * - 主色渐变 (#6366f1 → #06b6d4)
 * - 中性色阶 (ink scale)
 * - 紧凑圆角 (md: 8px)
 * - Inter 字体
 * - 关闭 wireframe（用项目自定义 CSS）
 *
 * 完整规范见 docs/style-guide.md
 */
const AntdProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <AntdRegistry>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: BRAND.start,
            colorInfo: BRAND.end,
            colorSuccess: '#059669',
            colorWarning: '#d97706',
            colorError:   '#dc2626',

            colorText:        INK[900],
            colorTextSecondary: INK[700],
            colorTextTertiary:  INK[500],
            colorTextQuaternary: INK[300],

            colorBorder:        INK[100],
            colorBorderSecondary: INK[50],

            colorBgContainer:   '#ffffff',
            colorBgLayout:      '#fafbfc',
            colorBgElevated:    '#ffffff',

            borderRadius: RADIUS.md,
            borderRadiusLG: RADIUS.lg,
            borderRadiusSM: RADIUS.sm,

            fontFamily: FONT.family,
            fontSize: FONT.sizes.base,

            // 关闭 antd 默认阴影（用 globals.css 自定义）
            boxShadow: 'none',
            boxShadowSecondary: 'none',
          },
          components: {
            Button: {
              borderRadius: RADIUS.md,
              controlHeight: 36,
              fontWeight: 500,
            },
            Card: {
              borderRadiusLG: RADIUS.xl,
              paddingLG: 24,
            },
            Modal: {
              borderRadiusLG: RADIUS.xl,
            },
            Table: {
              borderRadiusLG: RADIUS.xl,
              headerBg: 'transparent',
              headerColor: INK[500],
              headerSortActiveBg: 'transparent',
              headerSortHoverBg: 'transparent',
              rowHoverBg: BG.hover,
              cellPaddingBlock: 16,
              cellPaddingInline: 24,
            },
            Tabs: {
              itemSelectedColor: BRAND.start,
              inkBarColor: BRAND.start,
              titleFontSize: FONT.sizes.base,
            },
            Input: {
              borderRadius: RADIUS.md,
              controlHeight: 36,
            },
            Select: {
              borderRadius: RADIUS.md,
              controlHeight: 36,
            },
            DatePicker: {
              borderRadius: RADIUS.md,
              controlHeight: 36,
            },
          },
          algorithm: theme.defaultAlgorithm,
        }}
      >
        {children}
      </ConfigProvider>
    </AntdRegistry>
  )
}

export default AntdProvider