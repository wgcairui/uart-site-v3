# 百事服 IoT 设备管理平台

物联网设备监控与管理平台，支持用户端和管理员端双端系统。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16.2 + React 19 + TypeScript |
| 路由 | App Router（文件系统路由） |
| UI | Ant Design v5 |
| 状态管理 | Zustand |
| 实时通信 | Socket.IO |
| 地图 | @uiw/react-amap（高德地图） |

## 项目结构

```
uart-site-v3/
├── app/                    # 路由页面
│   ├── (user)/            # 用户端
│   │   └── main/          # /main/...
│   ├── (admin)/           # 管理员端
│   │   └── admin/         # /admin/...
│   └── login/              # 登录页
├── components/             # 共享组件
├── lib/                    # 工具库（API、hooks、状态）
├── providers/              # React Providers
├── types/                  # 全局类型定义
└── docs/                   # 架构文档
```

## 快速开始

```bash
bun install
bun run dev
```

访问 http://localhost:3000

## 双端系统

- **用户端** `/main` — 设备监控、告警管理、数据查看
- **管理员端** `/admin` — 用户管理、设备管理、日志查询、数据统计

## API 说明

后端 API 独立部署于 `https://uart.ladishb.com`，前端通过 `next.config.ts` rewrites 代理。

| 环境变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_API_URL` | API 地址（可选，默认使用同源代理） |

## 开发注意

- TypeScript 验证：`bun run tsc`
- ESLint：`bun run lint`
- 生产构建：`bun run build`