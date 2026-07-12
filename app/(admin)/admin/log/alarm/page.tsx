'use client'
import { Log } from '@/components/log/log'
import { loguartterminaldatatransfinites } from '@/lib/api/fetchRoot'
import { getColumnSearchProp } from '@/lib/utils/tableCommon'

export const LogAlarm: React.FC = () => {
  return (
    <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
      <Log
        lastDay={30}
        dataFun={loguartterminaldatatransfinites}
        cPie={['tag']}
        columns={[
          { dataIndex: 'mac', title: 'mac', ...getColumnSearchProp('mac') },
          { dataIndex: 'pid', title: 'pid' },
          { dataIndex: 'tag', title: 'tag', ...getColumnSearchProp('tag') },
          { dataIndex: 'msg', title: 'msg', ellipsis: true },
          {
            dataIndex: 'timeStamp',
            title: '时间',
            defaultSortOrder: 'descend',
            sorter: (a: any, b: any) => a.timeStamp - b.timeStamp,
          },
        ]}
      />
    </div>
  )
}

export default LogAlarm