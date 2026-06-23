# CLAUDE.md — docs/ 目录

项目文档入口。所有架构、设计规范、迁移指南都在这里。

## 文档清单

```
docs/
├── CLAUDE.md              # 本文件（文档索引）
├── architecture.md        # 系统架构、数据流、模块依赖
├── migration-guide.md     # v2 → v3 迁移细节
├── style-guide.md         # 视觉设计规范（design tokens / 组件视觉规则）
└── components.md          # 组件库规范（核心组件 props + 业务组件视觉规则）
```

## 阅读顺序

**首次进入项目**：

1. 根目录 `CLAUDE.md` — 项目全景
2. `docs/architecture.md` — 了解架构
3. `docs/style-guide.md` — 视觉规范（写任何页面/组件前必读）
4. `docs/components.md` — 组件库规范（新建/修改组件前必读）

**迁移相关问题**：

- v2 → v3 对照：`docs/migration-guide.md`

## 强制约束（写代码前必看）

### 视觉风格基线

**方案 C · 浅色极简 SaaS**。所有 token 定义在 `docs/style-guide.md`。

**绝对不允许**：

- 出现 antd 默认蓝 `#1677ff` 作为主色
- 自定义 toast / 弹窗（用 antd `message` / `Modal.confirm`）
- 超过 16px 的大圆角（除卡片 16px）
- 粗黑阴影（`shadow-lg` / `shadow-2xl`）
- 自动播放动画
- 数字不加 `tabular-nums`

完整反模式清单见 `docs/style-guide.md` 第 6 节。

### 组件复用原则

**优先复用 `components/common/*`**，不要自己写卡片/表格/统计卡。

详见 `docs/components.md` 第 4 节"何时该新建 vs 复用"。

### 修改组件必须过的 review 清单

详见 `docs/components.md` 第 5 节——视觉一致性 / Props / 'use client' / 性能 / a11y 5 个维度。

---

## 如果你发现文档过时

- Token 改了 → 同步更新 `docs/style-guide.md`
- 新增通用组件 → 同步更新 `docs/components.md` 第 2 节
- 新业务组件域 → 同步更新 `docs/components.md` 第 3 节
- 迁移完成 → 在 `docs/migration-guide.md` 加一段记录

**改代码时文档要一起改**——文档跟代码脱节比没文档更糟。