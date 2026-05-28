'use client'
import dayjs from "dayjs"
import { logdataclean } from "@/lib/api/fetchRoot"
import { Log } from "@/components/log"

export const LogDataClean: React.FC = () => {

    const Ms = (ms: number) => {
        if (ms) {
            const s = parseInt((ms / 1000).toFixed(0))
            if (s > 59) {
                return ((s / 60).toFixed(0) + '分') + (s % 60 + '秒')
            } else {
                return s + '秒'
            }
        } else {
            return "null"
        }
    }
    return (
        <Log
            lastDay={120}
            dataFun={logdataclean}
            columns={[
                {
                    dataIndex: 'timeStamp',
                    title: '日期',
                    render: val => dayjs(val).format('MM/DD')
                },
                {
                    dataIndex: 'CleanClientresultsTimeOut',
                    title: '超期数据'
                },
                {
                    dataIndex: 'NumClientresults',
                    title: '重复设备数据'
                },
                {
                    dataIndex: 'NumUserRequst',
                    title: '重复请求数据'
                },
                {
                    dataIndex: 'useTime',
                    title: '耗时',
                    render: (val) => Ms(val)
                }
            ]}
        />
    )
}


export default LogDataClean
