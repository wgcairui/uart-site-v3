'use client'
import { Button, Card, Col, Divider, Form, Input, Row, Select, Timeline, message } from "antd";
import dayjs from "dayjs";
import React, { useState } from "react";
import { getTerminal, SendProcotolInstructSet } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";

interface Props {
	mac: string;
}

export const TerminalOprate: React.FC<Props> = ({ mac }) => {
	const [dev, setDev] = useState("");

	const [oprate, setOprate] = useState("");

	const [msg, setMsg] = useState<{ type: boolean; text: string; time: number }[]>([]);

	const { data, loading } = usePromise(async () => {
		const { data } = await getTerminal(mac);
		return data.mountDevs || [];
	}, []);

	const query = async () => {
		const key = "queryOprate";
		message.loading({ content: "正在处理", key });
		const { protocol, pid } = data.find((el) => el.mountDev === dev)!;
		setMsg((m) => [{ type: true, text: `${dev}/${protocol}/${pid}/${oprate}`, time: Date.now() }, ...m]);

		const { data: r } = await SendProcotolInstructSet(
			{ DevMac: mac, protocol, pid, mountDev: dev },
			{ name: oprate, value: "", bl: "", readme: "", tag: oprate }
		);
		setMsg((m) => [{ type: false, text: `code:${r.ok}  msg:${r.msg}`, time: Date.now() }, ...m]);
		message.info({ content: "查询完成", key });
	};

	return (
		<Row gutter={36}>
			<Col span={8}>
				<Divider plain>操作</Divider>
				<Form>
					<Form.Item label="设备ID">{mac}</Form.Item>
					<Form.Item label="设备">
						<Select onSelect={(v: any) => setDev(v as any)} loading={loading}>
							{data.map((dev) => (
								<Select.Option value={dev.mountDev} key={dev.mountDev}>
									{dev.mountDev}
								</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item label="指令">
						<Input value={oprate} onChange={(e) => setOprate(e.target.value)} placeholder="输入受支持的指令,modbus无需输地址和校验码" />
					</Form.Item>
					<Form.Item>
						<Button onClick={() => query()} type="primary" disabled={!oprate}>
							发送
						</Button>
					</Form.Item>
				</Form>
			</Col>
			<Col span={16}>
				<Divider plain> 消息</Divider>
				{msg.length > 0 && (
					<Card>
						<Timeline mode="left" items={msg.map(({ type, text, time }) => ({
								label: dayjs(time).format("H:mm:ss") + (type ? "发送" : "接收"),
								color: type ? "green" : "red",
								children: text,
							}))} />
					</Card>
				)}
			</Col>
		</Row>
	);
};
