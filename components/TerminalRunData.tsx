'use client'
import { FundFilled, InfoCircleFilled, SyncOutlined } from "@ant-design/icons";
import { Space, Spin, Table, Tooltip } from "antd";
import { ColumnsType } from "antd/lib/table";
import dayjs from "dayjs";
import Link from "next/link";
import React, { useEffect } from "react";
import { useTerminalData } from "@/lib/hooks/useTerminalData";
import { generateTableKey, getColumnSearchProp, tableConfig } from "@/lib/utils/tableCommon";

interface Props {
	mac: string;
}

export interface DevDataProps extends Props {
	pid: number | string;
	user?: string;
}

interface UserRunDataProps extends DevDataProps {
	closeFilter?: boolean;
	OnUpdate?: (result: Uart.queryResultArgument[], data?: Uart.queryResultSave) => void;
}

/**
 * 设备数据
 */
export const TerminalRunData: React.FC<UserRunDataProps> = ({ mac, pid, user, closeFilter, OnUpdate }) => {
	const initRef = React.useRef(false);

	const { data, loading, fecth } = useTerminalData(mac, pid);

	useEffect(() => {
		if (OnUpdate && data && !initRef.current) {
			initRef.current = true;
			OnUpdate(data.result, data);
		}
	}, [data]);

	const result = data?.result ?? [];

	return !data ? (
		<Spin />
	) : (
		<section>
			<Space>
				<span>{dayjs.isDayjs(data.time) ? (data.time.isBefore(dayjs().startOf("day")) ? data.time.format("YYYY/M/D H:mm:ss") : data.time.format("H:mm:ss")) : (dayjs(data.time).isBefore(dayjs().startOf("day")) ? dayjs(data.time).format("YYYY/M/D H:mm:ss") : dayjs(data.time).format("H:mm:ss"))}</span>
				<SyncOutlined onClick={() => fecth()} spin={loading} />
			</Space>
			<Table
				dataSource={generateTableKey(result, "name")}
				loading={loading && !data}
				{...(tableConfig as any)}
				columns={
					[
						{
							dataIndex: "name",
							title: "参数",
							...getColumnSearchProp("name"),
						},
						{
							dataIndex: "parseValue",
							title: "值",
							render: (value, record) => (
								<span>
									{value + (!record.issimulate ? record.unit : "")}
									{
										<Tooltip color="cyan" title={`查看[${record.name}]的历史记录`}>
											<Link href={user ? `/main/devline/${mac + pid}?name=${record.name}` : `/root/node/terminal/devline?name=${record.name}&mac=${mac}&pid=${pid}`}>
												<FundFilled style={{ marginLeft: 8 }} />
											</Link>
										</Tooltip>
									}
									{record.alarm ? <InfoCircleFilled style={{ color: "#E6A23C" }} /> : <a />}
								</span>
							),
						},
					] as ColumnsType<Uart.queryResultArgument>
				}
			/>
		</section>
	);
};
