'use client'
import { Button, Card, DatePicker, Form, Timeline } from "antd";
import dayjs from "dayjs";
import React, { useState } from "react";
import { logterminalAggs } from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";
import { RepeatFilter } from "@/lib/utils/util";

interface Props {
	mac: string;
}

export const TerminalRunLog: React.FC<Props> = ({ mac }) => {
	const [date, setDate] = useState([dayjs().subtract(3, "month"), dayjs().endOf("day")]);

	const { data, loading, fecth } = usePromise(
		async () => {
			const { data } = await logterminalAggs(mac, date[0]?.format() || "", date[1]?.format() || "");
			return RepeatFilter(data?.items || []);
		},
		[],
		[date]
	);

	return (
		<>
			<Form layout="inline" style={{ marginBottom: 12 }}>
				<Form.Item label="查询时间段">
					<DatePicker.RangePicker value={[date[0], date[1]] as any} onChange={(_, d) => setDate(d.map((el) => dayjs(el)))}></DatePicker.RangePicker>
				</Form.Item>
				<Form.Item>
					<Button onClick={() => fecth()}>刷新</Button>
				</Form.Item>
			</Form>
			<Card style={{ maxHeight: 500, overflow: "auto" }} loading={loading}>
				<Timeline mode="start" items={data.map(({ msg, type, timeStamp }, i) => ({
						color: type ? "blue" : "green",
						key: timeStamp + i,
						label: dayjs(timeStamp).format("MM-DD H:m:s:SSS"),
						children: <p>{msg || type}</p>,
					}))} />
			</Card>
		</>
	);
};
