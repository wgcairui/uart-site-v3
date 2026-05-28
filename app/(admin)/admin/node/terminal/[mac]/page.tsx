'use client'
import { Spin, Tabs } from "antd";
import React, { useEffect } from "react";
import { getTerminalUser } from "@/lib/api/fetchRoot";
import { getTerminal } from "@/lib/api/fetch";

import { TerminalAT } from "@/components/TerminalAT";
import { TerminalOprate } from "@/components/TerminalOprate";
import { TerminalRunLog } from "@/components/TerminalRunLog";
import { TerminalDevPage } from "@/components/TerminalDevPage";
import { TerminalInfo } from "@/components/TerminalInfo";
import { TerminalMountDevs } from "@/components/TerminalMountDevs";
import { AlarmLogTab } from "@/components/AlarmLogTab";
import { usePromise } from "@/lib/hooks/usePromise";
import { useTerminalUpdate } from "@/lib/hooks/useTerminalData";
import { DevRealTimeLog } from "@/components/devRealTimeLog";

/**
 * 列出设备详细信息
 * @returns
 */
export default function Page({ params }: { params: { mac: string } }) {
	const { mac } = params;
	const { data, loading, setData, fecth } = usePromise(async () => {
		const { data } = await getTerminal(mac);
		return data;
	});

	const ter = useTerminalUpdate([mac]);

	useEffect(() => {
		if (ter.data) {
			setData(ter.data);
		}
	}, [ter.data]);

	return loading ? (
		<Spin />
	) : !data ? (
		<div style={{ textAlign: "center", padding: 50 }}>找不到该终端的数据</div>
	) : (
		<>
			<h2>
				{data.DevMac}/{data.name}
			</h2>
			<Tabs items={[
				{ key: 'info', label: '详细信息', children: <TerminalInfo terminal={data} ex={true} showTitle={false}></TerminalInfo> },
				{ key: 'mountDevs', label: '挂载设备', children: <TerminalMountDevs terminal={data} ex={true} showTitle={false} InterValShow onChange={fecth}></TerminalMountDevs> },
																{ key: 'at', label: 'AT调试', children: <TerminalAT mac={data.DevMac} /> },
				{ key: 'query', label: '指令调试', children: <TerminalOprate mac={data.DevMac} /> },
				{ key: 'listenMacLog', label: 'console', children: <DevRealTimeLog terminal={data} /> },
				{ key: 'log', label: '日志', children: <TerminalRunLog mac={data.DevMac}></TerminalRunLog> },
				{ key: 'alarm', label: '告警日志', children: <AlarmLogTab mac={data.DevMac}></AlarmLogTab> },
				...(data.mountDevs
					? data.mountDevs.map((dev) => ({
						key: dev.mountDev + dev.pid,
						label: dev.mountDev + dev.pid,
						children: <TerminalDevPage mac={data.DevMac} pid={dev.pid}></TerminalDevPage>,
					}))
					: []),
			]} />
		</>
	);
}
