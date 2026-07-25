'use client';
import React from 'react';

import { usePromise, defaultIsHttpSuccess, type IusePromise } from './usePromise';

/**
 * useDashboardStat — BFF 专用薄包装, 配对 lib/api/admin-summary/client.ts 7 个 BFF wrapper.
 *
 * 行为:
 * 1. **HTTP status 判定** (传入 defaultIsHttpSuccess) — BE success 返 code: 200, error 返
 *    code: 0 + status: 4xx/5xx. PR #81 修的 code vs status 颠倒问题.
 * 2. **universalResult 解套** — 抽 result.data 当 data 返回, 而不是 {code, data, message} 整层.
 * 3. **trial-mode 403 兜底** — fetch 抛错时静默返 initValue, page 不崩.
 *
 * usePromise 本身只做通用 promise 包装 + isHttpSuccess 判定, 不做 BFF 二次解套.
 * useDashboardStat 负责解套层, 是 usePromise 的 BFF-mode 薄包装.
 *
 * 41 个 page 文件用 `import { useDashboardStat } from '@/lib/hooks/useDashboardStat'`,
 * 行为保持向后兼容 (跟 PR #81 修复后一致).
 */
export function useDashboardStat<TResult>(
  fn: () => Promise<{ code: number; data: TResult; message?: string }>,
  deps: React.DependencyList,
  initValue: TResult
): IusePromise<TResult> {
  return usePromise(
    async () => {
      try {
        const result = await fn();
        return result.data as TResult;
      } catch {
        // fetch 抛错 (网络 / 401 / 403 trial mode) — 静默降级
        return initValue;
      }
    },
    initValue,
    deps,
    { isHttpSuccess: defaultIsHttpSuccess }
  );
}

export default useDashboardStat;
