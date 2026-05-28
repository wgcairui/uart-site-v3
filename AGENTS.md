<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Next.js 16.2 迁移关键规则

### params 是 Promise

**所有动态路由页面**必须用 `useParams()` 获取路由参数，不再从 props 解构：

```tsx
// ❌ 旧写法（Next.js 16.2 已不支持）
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params
}

// ✅ 正确写法
import { useParams } from 'next/navigation'
export default function Page() {
  const params = useParams()
  const id = params.id as string
}
```

受影响的页面（已知）：
- `app/(user)/main/dev/[id]/page.tsx`
- `app/(user)/main/terminal/[id]/page.tsx`
- `app/(admin)/admin/node/user/info/[user]/page.tsx`
- 以及所有 `[param]` 动态路由页面

## Ant Design v5 → v6 迁移（deprecation warnings）

antd v6 已废弃大量 v5 API，修复规律：

| 废弃写法 | 正确写法 |
|---|---|
| `<Spin tip="...">` | `<Spin description="...">` |
| `<Alert message="...">` | `<Alert title="...">` |
| `<Breadcrumb.Item>` + `<Breadcrumb.Separator>` | `<Breadcrumb items={[...]}>` |
| `<Input.Group compact>` | `<Space.Compact>` |

受影响的已知页面：
- `app/simulate-login/page.tsx` — Spin tip
- `app/(user)/layout.tsx` — Alert message
- `app/(user)/main/dev/[id]/page.tsx` — Breadcrumb.Item
- `app/(user)/main/terminal/[id]/page.tsx` — Breadcrumb.Item + params
- `app/(user)/main/addterminal/page.tsx` — Input.Group

后续可能还有 Tabs.items、Table.items、Form.items 等全面迁移，参考 antd 官方迁移文档。
