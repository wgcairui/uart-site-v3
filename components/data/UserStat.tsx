'use client'
import { MehFilled, FrownFilled } from '@ant-design/icons'

import { getUserOnlineStat } from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";

interface Props {
    user: string
}

/**
 * @returns
 */
export const UserStat: React.FC<Props> = ({ user }) => {

    const { data, fecth } = usePromise(async () => {
        const el = await getUserOnlineStat(user);
        return el.data;
    }, false, [])

    return (
        <>
            {
                data ? <MehFilled style={{ color: 'green', fontSize: 24 }} onClick={() => fecth()} /> : <FrownFilled style={{ fontSize: 24 }} onClick={() => fecth()} />
            }
        </>
    )
}


/**
 * 用户信息
 * @param param0
 */
