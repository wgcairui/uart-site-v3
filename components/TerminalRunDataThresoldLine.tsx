'use client'
import { Button, DatePicker, Divider, Empty, Form, Table } from "antd";
import dayjs from "dayjs";
import React, { useState } from "react";
import { getTerminalDatasV2, getTerminalPidProtocol, getProtocolSetup } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { generateTableKey } from "@/lib/utils/tableCommon";
import { DevDataProps } from "./TerminalRunData";

export const TerminalRunDataThresoldLine: React.FC<DevDataProps & { time?: string | number }> = ({ mac, pid, user, time }) => {
	const [date, setDate] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs(time).subtract(10, "minute"), dayjs(time)]);

	const { data, fecth, loading } = usePromise(
		async () => {
			const protocol = await getTerminalPidProtocol(mac, pid);
			const setup = await getProtocolSetup<Uart.Threshold>(protocol.data.protocol, "Threshold", user).then(({ data: { sys, user } }) => {
				const sMap = new Map(sys.map((el) => [el.name, el]));
				if (user.length > 0) {
					const uMap = new Map(user.map((el) => [el.name, el]));
					sMap.forEach((_, key) => {
						if (uMap.has(key)) {
							sMap.set(key, uMap.get(key)!);
						}
					});
				}
				return sMap;
			});

			const { data } = await getTerminalDatasV2(mac, pid, [...setup.keys()], date[0].valueOf(), date[1].valueOf());
			return data.items.map((el) => ({ ...el, time: dayjs(el.time).format("M/D H:m:s"), value: parseFloat(el.value as string) }));
		},
		[],
		[date]
	);

	return (
		<>
			<Divider plain>
				展示告警约束参数的运行状态
			</Divider>
			<Form layout="inline">
				<Form.Item label="选择时间">
					<DatePicker.RangePicker showTime={{ format: "HH:mm:ss" }} format="YYYY-MM-DD HH:mm:ss" value={date as any} onOk={(val: any) => setDate(val)} />
				</Form.Item>
				<Form.Item>
					<Button type="primary" onClick={() => fecth()}>
						刷新
					</Button>
				</Form.Item>
			</Form>
			{data.length > 0 ? (
				<Table dataSource={generateTableKey(data, "_id" as any)} size="small" pagination={false} scroll={{y: 300}}>
                    <Table.Column dataIndex="name" title="名称"></Table.Column>
                    <Table.Column dataIndex="value" title="值"></Table.Column>
                    <Table.Column dataIndex="time" title="时间"></Table.Column>
                </Table>
			) : (
				<Empty description="没有数据" style={{ marginTop: 36 }}></Empty>
			)}
		</>
	);
};
