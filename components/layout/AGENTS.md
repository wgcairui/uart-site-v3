# layout 前端模块 (2026-07-24 PR-13 文档化)

> 前端职责: admin 端布局容器 (侧边栏 + 顶栏 + 浮动按钮) + 全局样式

## 触发模型

```
admin 路由 /main/* → AdminSider (左) + AdminHeader (顶) + 内容区
   ↓
UserDropDown (右上) → 模拟登录 / 退出
   ↓
AbsButton (浮动) → 折叠/展开 quick-action panel (legacy, 1 个用法)
```

## 目录

```
components/layout/
├── AGENTS.md                              (本文件)
├── AbsButton.tsx                          浮动按钮 + 浮层 (svg 双箭头 + 0.5s 动画)
├── AdminHeader.tsx                        顶栏 (面包屑 / currentTitle / UserDropDown)
├── AdminSider.tsx                         侧边栏 (240px/72px 折叠态 + 紫光 aurora)
└── absButton.css                          AbsButton 专用 CSS

依赖:
lib/constants/adminMenu.ts                  ADMIN_MENU 配置 + matchMenuKey
components/common/BrandLogo.tsx             (备用, 当前 inline 渐变方块)
components/common/UserDropdown.tsx          顶栏 user dropdown
```

## 关键设计

| 维度 | 决策 |
|---|---|
| **侧边栏宽度** | 240px 展开 / 72px 折叠, `transition: width .25s cubic-bezier(.4, 0, .2, 1)` |
| **顶栏面包屑** | `usePathname()` 拆段 → `SEGMENT_LABELS` 映射 → desktop 完整多段, mobile 单段 `currentTitle` |
| **`at(-1)` 取最后段** | 避开 `noUncheckedIndexedAccess` 模式 `array[idx]` 可能 undefined 的类型报错 |
| **折叠按钮** | 浮动右上角 (absolute + z-index 20), 圆形白底, hover 紫光 |
| **Aurora 背景** | 2 个 radial-gradient 紫光 (top-left accent-400 / bottom-right brand-400), blur 40px, opacity 0.15-0.18 |
| **选中态** | 紫粉渐变背景 + 白色文字 + 左侧 3px 渐变条 (box-shadow glow) |
| **Avatar 渐变** | `linear-gradient(135deg, var(--brand-500) 0%, var(--accent-400) 100%)` |
| **AbsButton 浮层** | svg 双箭头 + 0.5s opacity/transform 动画, click 外部点关闭 |

## 复用既有工具

| 工具 | 来源 | 用法 |
|---|---|---|
| `UserDropDown` | `components/common/UserDropdown` | 顶栏右侧 user dropdown |
| `usePathname` | `next/navigation` | 面包屑 / 选中态定位 |
| `Link` | `next/link` | 侧边栏导航 |
| `matchMenuKey` / `ADMIN_MENU` | `lib/constants/adminMenu` | 路径 → menu key 反查 + 菜单源 |

## SEGMENT_LABELS 映射 (AdminHeader.tsx:7-31)

`admin` 后台 · `main` 前台 · `node` 节点管理 · `protocols` 协议 · `devmodel` 设备类型 · `terminal` 终端 · `user` 用户 · `log/alarm/mail/sms` 日志/告警/邮件/短信 · `data` 数据 · `wx` 微信 · `users` 公众号用户 · `oss/redis` OSS/Redis · `info` 详情 · `addterminal` 添加终端 · `userinfo` 用户信息 · `generate` AI 生成 (PR-2 2026-07-17 搬路径)

未在表中的段 → fallback 显示 path 原文 (`SEGMENT_LABELS[seg] ?? seg`)

## 验证 (dev mode)

1. admin 登录 → 任意 page → 侧边栏显示菜单, 选中态高亮
2. 点折叠按钮 → 240px → 72px, 只剩 icon + 渐变背景
3. 切到 mobile width → 顶栏单段 `currentTitle` (e.g. `用户管理`)
4. 点顶栏 user dropdown → 模拟登录 / 退出可用
5. AbsButton (legacy): 浮层动画 + click 外部关闭

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| 移动端完整面包屑被挤变形 | desktop 多段 + mobile 单段 `currentTitle` 双套, CSS class 切换 |
| `noUncheckedIndexedAccess` 报错 `array[idx]` undefined | `at(-1)?.label` 替代 `arr[arr.length-1].label` |
| 侧边栏深色背景 — 部分 light mode 跳进 | 全 admin 端统一 dark 玻璃风, 不混 light/dark |
| AbsButton SVG path 是长字面量 | 没法压缩, 留 inline; 不影响功能 |
| AdminSider 大量 inline style (200+ 行) | 待 PR 抽到 `app-sider-v3` CSS class (现状沿用 v3 模板) |

## 不在本次范围

- user 端布局 (在 (user)/layout.tsx 单独管理) / 移动端 hamburger menu / 多语言 i18n / 暗色亮色 mode 切换
