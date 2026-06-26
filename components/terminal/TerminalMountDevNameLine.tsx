'use client'
import { Button, Card, Col, DatePicker, Empty, Form, Row, Table, Tabs } from "antd";
import dayjs from "dayjs";
import React, { useCallback, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDeviceChartData, getProtocol, getTerminalPidProtocol } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { generateTableKey } from "@/lib/utils/tableCommon";
import { ProtocolInstructSelect } from "@/components/protocol/ProtocolInstructSelect";

interface Props {
	mac: string;
	pid: string | number;
	name: string;
}

interface DataItem {
	_id?: string;
	name: string;
	value: string | number;
	time: string;
	unit?: string;
	issimulate?: boolean;
}

// 折线图数据按 time 聚合：{ time, [name]: value, ... }
interface ChartPoint {
	time: string;
	[key: string]: string | number;
}

// 给每个参数名分配固定颜色，多选时容易区分
const PALETTE = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'] as const;

/**
 * 设备参数历史数据：左侧折线图（3/4），右侧 Tabs 列表（1/4，每个参数一个 tab）
 * 多选参数通过 URL ?name=A&name=B 持久化（兼容单选 ?name=A）
 */
export const TerminalMountDevNameLine: React.FC<Props> = ({ mac, pid, name }) => {
	const router = useRouter();
	const pathname = usePathname();
	const search = useSearchParams();

	// 初始选中的参数列表：URL ?name=A&name=B > 父级传入的 name > []
	const [selects, setSelectsState] = useState<string[]>(() => {
		const fromUrl = search.getAll("name");
		if (fromUrl.length > 0) return fromUrl;
		return name ? [name] : [];
	});

	// 切换参数时同步回 URL（单选 ?name=A，多选 ?name=A&name=B）
	const setSelects = useCallback(
		(next: string[]) => {
			setSelectsState(next);
			const params = new URLSearchParams(search.toString());
			params.delete("name");
			next.forEach((n) => params.append("name", n));
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname);
		},
		[router, pathname, search]
	);

	const [dates, setDate] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(1, "day"), dayjs()]);

	const Protocol = usePromise(
		async () => {
			const el = await getTerminalPidProtocol(mac, Number(pid));
			return el.data;
		},
		undefined,
		[mac, pid]
	);

	// 协议里 formResize[].unit 提供「参数名 → 单位」映射
	// 后端 resultcolltions.result[] 不带 unit 字段（已验证 mongo），必须从协议配置查
	const Instructs = usePromise(
		async () => {
			if (!Protocol.data?.protocol) return [];
			const { data } = await getProtocol(Protocol.data.protocol);
			return data.instruct || [];
		},
		[],
		[Protocol.data?.protocol]
	);

	const unitMap = useMemo<Record<string, string>>(() => {
		const m: Record<string, string> = {};
		for (const inst of Instructs.data) {
			for (const f of inst.formResize ?? []) {
				if (f.unit) m[f.name] = f.unit;
			}
		}
		return m;
	}, [Instructs.data]);

	const { data, loading, fecth } = usePromise(
		async () => {
			if (selects.length === 0) return [];
			const { data } = await getDeviceChartData(mac, pid, selects, dates[0].valueOf(), dates[1].valueOf(), { dedup: true, maxPoints: 500 });
			return data.items.map((el) => ({ ...el, time: dayjs(el.time).format("M/D H:m:s") }));
		},
		[],
		[mac, pid, selects, dates]
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

	// 按 name 分组，供右侧 Tabs 使用
	const byName = useMemo<Record<string, DataItem[]>>(() => {
		const m: Record<string, DataItem[]> = {};
		for (const item of data) {
			const bucket = m[item.name] ?? (m[item.name] = []);
			bucket.push(item);
		}
		return m;
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
				<Row gutter={16} wrap={false}>
					{/* 左：折线图，占 70%。
					    注意：antd v6 parseFlex 收到 number 时输出 "N N auto"（basis: auto），
					    recharts ResponsiveContainer 内部 min-width 会被当成 Col 内容固有宽度，
					    撑破 Row 导致 wrap。改用百分比字符串走 "0 0 70%" 固定宽度分支。 */}
					<Col flex="70%">
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
					{/* 右：数据列表，占 30%，每个参数一个 tab */}
					<Col flex="30%">
						<Card
							size="small"
							title={`数据列表 (${data.length})`}
							styles={{ body: { padding: 0 } }}
							style={{ height: 580 }}
						>
							<Tabs
								size="small"
								style={{ height: '100%' }}
								items={selects.map((s) => ({
									key: s,
									label: (
										<span>
											<span
												style={{
													display: 'inline-block',
													width: 8,
													height: 8,
													borderRadius: '50%',
													background: colorMap[s] ?? PALETTE[0],
													marginRight: 6,
													verticalAlign: 'middle',
												}}
											/>
											{s} ({byName[s]?.length ?? 0})
										</span>
									),
									children: (
										<Table
											dataSource={generateTableKey(byName[s] ?? [], "_id" as any)}
											size="small"
											tableLayout="fixed"
											pagination={{ pageSize: 20, showSizeChanger: false, size: "small" }}
											scroll={{ y: 440 }}
										>
											<Table.Column
												dataIndex="time"
												title="时间"
												width={140}
												render={(v) => <span style={{ whiteSpace: 'nowrap' }}>{v}</span>}
											/>
											<Table.Column
												dataIndex="value"
												title="值"
												width={80}
												render={(value, record: DataItem) => {
													if (record.issimulate) return <span>{value}</span>;
													const unit = record.unit || unitMap[record.name] || "";
													return <span>{value}{unit}</span>;
												}}
											/>
										</Table>
									),
								}))}
							/>
						</Card>
					</Col>
				</Row>
			)}
		</>
	);
};
