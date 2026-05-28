'use client'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import type { FC, PropsWithChildren } from 'react'

const AntdProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <AntdRegistry>
      <ConfigProvider locale={zhCN}>
        {children}
      </ConfigProvider>
    </AntdRegistry>
  )
}

export default AntdProvider
