'use client'
import { Button, Card, Col, DatePicker, Empty, Form, Row, Table } from "antd";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDeviceChartData, getTerminalPidProtocol } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { generateTableKey } from "@/lib/utils/tableCommon";
import { ProtocolInstructSelect } from "@/components/protocol/ProtocolInstructSelect";

interface Props {
	mac: string;
	pid: string | number;
	name: string;
}

// 折线图数据按 time 聚合：{ time, [name]: value, ... }
interface ChartPoint {
	time: string;
	[key: string]: string | number;
}

// 给每个参数名分配固定颜色，多选时容易区分
const PALETTE = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'] as const;

/**
 * 设备参数历史数据：左侧折线图（2 份），右侧列表（1 份）
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
			const { data } = await getDeviceChartData(mac, pid, selects, dates[0].valueOf(), dates[1].valueOf(), { dedup: true, maxPoints: 500 });
			return data.items.map((el) => ({ ...el, time: dayjs(el.time).format("M/D H:m:s") }));
		},
		[],
		[mac, pid, name, selects, dates]
	);

	// 把 [{name, value, time}, ...] pivot 成 [{time, name: value, ...}, ...]
	const chartData = useMemo<ChartPoint[]>(() => {
		const byTime = new Map<string, ChartPoint>();
		for (const item of data) {
			if (!byTime.has(item.time)) {
				byTime.set(item.time, { time: item.time });
			}
			byTime.get(item.time)![item.name] = Number(item.value) || 0;
		}
		return Array.from(byTime.values());
	}, [data]);

	const colorMap = useMemo(() => {
		const m: Record<string, string> = {};
		selects.forEach((s, i) => {
			m[s] = PALETTE[i % PALETTE.length] ?? PALETTE[0];
		});
		return m;
	}, [selects]);

	return !Protocol.data ? (
		<Empty description />
	) : (
		<>
			<Form layout="inline" style={{ marginBottom: 12 }}>
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
				<Empty description={loading ? "正在加载" : "暂无数据"} style={{ marginTop: 32 }} />
			) : (
				<Row gutter={16}>
					{/* 左：折线图，2 份 */}
					<Col flex={2}>
						<Card
							size="small"
							title="趋势图"
							styles={{ body: { padding: 12 } }}
							style={{ height: 580 }}
						>
							<ResponsiveContainer width="100%" height={520}>
								<LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="time" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} />
									<YAxis tick={{ fontSize: 12 }} />
									<Tooltip />
									<Legend />
									{selects.map((s) => (
										<Line
											key={s}
											type="monotone"
											dataKey={s}
											name={s}
											stroke={colorMap[s] ?? PALETTE[0]}
											strokeWidth={2}
											dot={false}
											connectNulls
										/>
									))}
								</LineChart>
							</ResponsiveContainer>
						</Card>
					</Col>
					{/* 右：数据列表，1 份 */}
					<Col flex={1}>
						<Card
							size="small"
							title={`数据列表 (${data.length})`}
							styles={{ body: { padding: 0 } }}
							style={{ height: 580 }}
						>
							<Table
								dataSource={generateTableKey(data, "_id" as any)}
								size="small"
								pagination={{ pageSize: 20, showSizeChanger: false, size: "small" }}
								scroll={{ y: 480 }}
							>
								<Table.Column dataIndex="name" title="名称" width={90} />
								<Table.Column dataIndex="value" title="值" width={80} />
								<Table.Column dataIndex="time" title="时间" />
							</Table>
						</Card>
					</Col>
				</Row>
			)}
		</>
	);
};
