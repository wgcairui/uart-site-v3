'use client';

import { usePromise } from './usePromise';

/**
 * useDashboardStat — 薄包装 usePromise, 解决 3 个 page-level 痛点:
 *
 * 1. **默认 null vs 默认空对象** — `usePromise` 初始 data 是 `undefined` (即使传了 initValue).
 *    page 端每次写 `data?.x ?? 0` 模板代码, 9 个 page 重复 27 次.
 *    包装后 `data` 永远是 `T` (initValue 必传, 不允许 undefined).
 *
 * 2. **universalResult 解包** — BFF 客户端 (`lib/api/admin-summary/client.ts`) 返 `universalResult`
 *    单层 `{ code, data, message }` (`Get<T>` 在 `lib/api/fetch-impl.ts:49` 是 axios 解套后
 *    直接返 parsed JSON, 不再包一层). 包装后 `data` 已经是 `TResult` (BFF 真实数据),
 *    code !== 0 时返 initValue + 走 err.
 *
 * 3. **trial-mode 403 兜底** — 无真实 user 数据的 trial 模式返 403.
 *    BFF 客户端 fetch 在 403 时通常 throw 或返 { code: 403, data: null }.
 *    包装后捕获所有 err, 静默返 initValue (page 不崩, 显示 "—").
 *
 * 用法:
 * ```ts
 * const { data: sevDist, loading } = useDashboardStat(
 *   () => getAlarmSeverityDistribution('24h'),
 *   [],
 *   []  // AlarmSeverityDistributionResp 默认空数组
 * )
 * // data: AlarmSeverityDistributionResp = [] (空数组兜底, 不是 undefined)
 * ```
 *
 * 之前的 wrapper workaround (`() => ({ data: await getXxx() })`) **已废弃**: 当时 hook 错位
 * 期望外层 envelope, BFF 实际返内层 universalResult. PR #71 review 已修, 后续 W4-W7 rebase
 * 时各自清理 page 里的 wrapper.
 *
 * 不在本期:
 * - SWR stale-while-revalidate 模式 (60s 内不重发). usePromise 已经够用.
 * - 跨页 dedup (多页同时打开各发一次). 60s Redis cache 在 BE 端, 重复请求也命中 cache.
 * - realtime push. 后续如需要, 加 useEffect + socket subscription.
 *
 * 配对: lib/api/admin-summary/client.ts 7 个 BFF wrapper
 */
export interface IUseDashboardStat<TResult> {
  loading: boolean;
  data: TResult;
  err: any;
  /** 重新拉取 (BFF 客户端在 prod 60s 内会命中 Redis cache) */
  fecth: () => void;
}

export function useDashboardStat<TResult>(
  fn: () => Promise<{ code: number; data: TResult; message?: string }>,
  deps: React.DependencyList,
  initValue: TResult
): IUseDashboardStat<TResult> {
  const { loading, data: rawData, err, fecth } = usePromise(async () => {
    try {
      const result = await fn();
      // universalResult 解套: 只在 code === 0 + data 存在时返真实 data, 其他情况返 initValue
      if (result?.code === 0 && result.data !== undefined && result.data !== null) {
        return result.data as TResult;
      }
      // code !== 0 (业务错误) 或 data 为空 — 静默降级, 不抛
      return initValue;
    } catch {
      // fetch 抛错 (网络 / 401 / 403 trial mode) — 静默降级
      return initValue;
    }
  }, initValue, deps);

  return {
    loading,
    data: (rawData ?? initValue) as TResult,
    err,
    fecth,
  };
}
