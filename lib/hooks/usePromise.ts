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
    setData: React.Dispatch<SetStateAction<T>>
}

/**
 * 组合hook,传入promise,等待结果生成后返回
 * @param fn 传入的promise函数
 * @param initValue 默认初始值
 * @param deps 监听数组
 * @returns
 */
export const usePromise = <T,>(fn: () => Promise<T>, initValue?: T | (() => T), deps?: React.DependencyList): IusePromise<T> => {

    const [loading, setLoading] = useState(true)

    const [data, setData] = initValue ? useState<T>(initValue) : useState<T>()

    const [err, setErr] = useState<any>()

    function fecth() {
        setLoading(true)
        fn()
            .then((el: any) => setData(el))
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
        setData: setData as React.Dispatch<SetStateAction<T>>
    }
}
