'use client'
import { Button, DatePicker, Empty, Form, Table } from "antd";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import { getTerminalDatasV2, getTerminalPidProtocol } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { generateTableKey } from "@/lib/utils/tableCommon";
import { ProtocolInstructSelect } from "./ProtocolInstructSelect";

interface Props {
	mac: string;
	pid: string | number;
	name: string;
}

/**
 * 设备参数运行状态
 */
export const TerminalMountDevNameLine: React.FC<Props> = ({ mac, pid, name }) => {
	const [selects, setSelects] = useState<string[]>([name]);

	useEffect(() => {
		setSelects([name]);
	}, [name]);

	const [dates, setDate] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(1, "day"), dayjs()]);

	const Protocol = usePromise(
		async () => {
			const el = await getTerminalPidProtocol(mac, Number(pid));
			return el.data;
		},
		undefined,
		[mac, pid]
	);

	const { data, loading, fecth } = usePromise(
		async () => {
			if (selects.length === 0) return [];
			const { data } = await getTerminalDatasV2(mac, pid, selects, dates[0].valueOf(), dates[1].valueOf());
			return data.items.map((el) => ({ ...el, time: dayjs(el.time).format("M/D H:m:s") }));
		},
		[],
		[mac, pid, name, selects, dates]
	);

	const lineSlideStart = useMemo(() => {
		const dataLen = data.length / selects.length;

		return dataLen <= 100 ? 0 : (dataLen - 100) / dataLen;
	}, [data, selects]);

	return !Protocol.data ? (
		<Empty description />
	) : (
		<>
			<Form layout="inline">
				<Form.Item label="选择日期">
					<DatePicker.RangePicker defaultValue={dates as any} onChange={(value) => setDate(value as any)} disabledDate={(d) => d > dayjs().endOf("day")}></DatePicker.RangePicker>
				</Form.Item>
				<Form.Item label="选择参数">
					<ProtocolInstructSelect defaultValue={selects} protocolName={Protocol.data.protocol} multiple onChange={(val) => setSelects(val as string[])}></ProtocolInstructSelect>
				</Form.Item>
				<Form.Item wrapperCol={{ offset: 1 }} style={{ alignItems: "end" }}>
					<Button type="primary" onClick={() => fecth()}>
						刷新
					</Button>
				</Form.Item>
			</Form>
			{data.length === 0 ? (
				<Empty description={loading ? "正在加载" : "暂无数据"} />
			) : (
				<Table dataSource={generateTableKey(data, "_id" as any)} size="small" pagination={false} scroll={{y: 300}}>
                    <Table.Column dataIndex="name" title="名称"></Table.Column>
                    <Table.Column dataIndex="value" title="值"></Table.Column>
                    <Table.Column dataIndex="time" title="时间"></Table.Column>
                </Table>
			)}
		</>
	);
};
