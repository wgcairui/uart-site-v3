'use client'
import React, { SetStateAction, useEffect, useState } from "react";

/**
 * usePromise 返回值
 */
export interface IusePromise<T> {
    /**
     * 等待结果生成
     */
    loading: boolean;
    /**
     * 数据
     */
    data: T;
    /**
     * 错误
     */
    err: any;
    /**
     * 重新请求
     */
    fecth: () => void
    /**
     * 设置数据
     */
    setData: React.Dispatch<SetStateAction<T | undefined>>
}

/**
 * usePromise options
 */
export interface IUsePromiseOptions {
    /**
     * BFF/HTTP success 判定.
     *
     * 适用于 BFF wrapper 返 universalResult<T> = {code, data, message} 单层的场景.
     * hook 会在 fn resolve 后调用 isHttpSuccess(result) 判定:
     * - true → 走 result (不二次解套, 保持通用 hook 职责)
     * - false → 走 initValue (静默降级, 不抛)
     *
     * 默认 `(r) => true` — 不做任何判定, 直接 setData(result), 行为跟之前一致
     * (向后兼容 22 个既有非-BFF 调用方). BFF 调用方 (e.g. useDashboardStat) 需自己传.
     */
    isHttpSuccess?: (result: any) => boolean;
}

/**
 * 默认 BFF HTTP success 判定 — 吸收 PR #81 修复.
 *
 * BE middleware (result-serialization.middleware.ts:64) 返:
 * - success: {code: 200, data: ...}
 * - error:   {code: 0, status: 4xx/5xx, message}
 *
 * 注意 BE 错误路径的 code 是业务码 0 (跟 "成功" 同号), 不能直接看 code.
 * 用 status 字段 (HTTP 风格) 兜底, 缺 status 时回退 code.
 *
 * 不作为 usePromise 默认值 (会误伤 22 个非-BFF 调用方), 仅供 BFF 调用方显式传入.
 */
export const defaultIsHttpSuccess = (r: any): boolean => {
    const status = r?.status ?? r?.code;
    return typeof status === 'number' && status >= 200 && status < 300;
};

/**
 * 组合hook,传入promise,等待结果生成后返回
 * @param fn 传入的promise函数
 * @param initValue 默认初始值
 * @param deps 监听数组
 * @param options 扩展配置 (BFF success 判定等)
 * @returns
 */
export const usePromise = <T,>(fn: () => Promise<T>, initValue?: T | (() => T), deps?: React.DependencyList, options?: IUsePromiseOptions): IusePromise<T> => {

    const [loading, setLoading] = useState(true)

    const [data, setData] = useState<T | undefined>(() => {
        if (typeof initValue === 'function') {
            return (initValue as () => T)()
        }
        return initValue as T | undefined
    })

    const [err, setErr] = useState<any>()

    function fecth() {
        setLoading(true)
        fn()
            .then((el: any) => {
                // 如果调用方显式传了 isHttpSuccess, 用它判定 result 是否成功
                if (options?.isHttpSuccess && !options.isHttpSuccess(el)) {
                    // BFF 业务错误 — 静默降级到 initValue
                    setData(initValue as T);
                    setErr(null);
                    return;
                }
                setData(el)
            })
            .catch(setErr)
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        fecth()
    }, deps || [])

    return {
        loading,
        data: data as T,
        err,
        fecth,
        setData: setData as React.Dispatch<SetStateAction<T | undefined>>
    }
}
