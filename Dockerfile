FROM oven/bun:1 AS base

# 安装依赖
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 构建
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# 运行
# 注意：原 Dockerfile 用 node:24-alpine，但当前 docker registry mirror
# （daocloud/163/tencentyun）均拉不到该镜像。改用 oven/bun:1 作 runner，
# bun 兼容 node API，可直接执行 server.js。
# bun:1 是 Debian base，没有 alpine 的 addgroup/adduser，改用 groupadd/useradd。
FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["bun", "run", "server.js"]
