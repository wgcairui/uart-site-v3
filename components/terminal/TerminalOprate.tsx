'use client'
import { Button, Card, Checkbox, Col, Divider, Form, Input, Row, Select, Timeline, message } from "antd";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { getTerminal, SendProcotolInstructSet } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { ScheduleOpModal } from "@/components/scheduled-op/ScheduleOpModal";
import { buildInstructItem } from "@/lib/utils/sendInstruct";

interface Props {
	mac: string;
}

export const TerminalOprate: React.FC<Props> = ({ mac }) => {
	const [dev, setDev] = useState("");

	const [oprate, setOprate] = useState("");

	const [msg, setMsg] = useState<{ type: boolean; text: string; time: number }[]>([]);

	// 「定时发送」checkbox (2026-06-30 决策 18)
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [scheduleChecked, setScheduleChecked] = useState(false);
	const [pendingItem, setPendingItem] = useState<Uart.OprateInstruct | null>(null);
	const [pendingProtocol, setPendingProtocol] = useState<string>("");

	const { data, loading } = usePromise(async () => {
		const { data } = await getTerminal(mac);
		return data.mountDevs || [];
	}, []);

	// dev 变化时, 默认 protocol = 当前选中 mountDev.protocol
	useEffect(() => {
		const found = data.find((el) => el.mountDev === dev);
		if (found?.protocol) setPendingProtocol(found.protocol);
	}, [dev, data]);

	const buildItem = async (): Promise<Uart.OprateInstruct | null> => {
		if (!dev || !oprate) {
			message.warning("请先选择设备和指令");
			return null;
		}
		const md = data.find((el) => el.mountDev === dev);
		if (!md) {
			message.error("未找到设备配置");
			return null;
		}
		// 直接组装一个最小 OprateInstruct, 不走 server fillInstructTemplate
		return {
			name: oprate,
			value: oprate,
			bl: "1",
			readme: "",
			tag: oprate,
		} as Uart.OprateInstruct;
	};

	// 立即发送 (admin 端走 admin/terminals SendProcotolInstructSet)
	const sendNow = async (item: Uart.OprateInstruct) => {
		const md = data.find((el) => el.mountDev === dev)!;
		const { data: r } = await SendProcotolInstructSet(
			{ DevMac: mac, protocol: pendingProtocol, pid: md.pid, mountDev: dev },
			item
		);
		return r;
	};

	const onSendClick = async () => {
		const key = "queryOprate";
		message.loading({ content: "正在处理", key });
		const item = await buildItem();
		if (!item) {
			message.destroy(key);
			return;
		}
		setMsg((m) => [{ type: true, text: `${dev}/${pendingProtocol}/${item.value}`, time: Date.now() }, ...m]);
		const r = await sendNow(item);
		setMsg((m) => [{ type: false, text: `code:${r?.ok}  msg:${r?.msg}`, time: Date.now() }, ...m]);
		message.info({ content: "查询完成", key });
	};

	// 勾上「定时」时, 「发送」按钮文案 + 行为切到 "定时发送"
	const onSendButtonClick = () => {
		if (scheduleChecked) {
			(async () => {
				const item = await buildItem();
				if (!item) return;
				setPendingItem(item);
				setScheduleOpen(true);
			})();
		} else {
			onSendClick();
		}
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
						<Checkbox
							checked={scheduleChecked}
							onChange={(e) => setScheduleChecked(e.target.checked)}
						>
							定时发送
						</Checkbox>
					</Form.Item>
					<Form.Item>
						<Button
							onClick={onSendButtonClick}
							type="primary"
							disabled={!oprate}
						>
							{scheduleChecked ? '定时发送' : '立即发送'}
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
			{pendingItem && (
				<ScheduleOpModal
					open={scheduleOpen}
					mac={mac}
					pid={data.find((el) => el.mountDev === dev)?.pid ?? 0}
					item={pendingItem}
					protocolName={pendingProtocol}
					api="admin"
					onCancel={() => {
						setScheduleOpen(false)
						setPendingItem(null)
					}}
					onSuccess={() => {
						setMsg((m) => [{ type: true, text: `${dev}/${pendingProtocol}/${pendingItem.value} (定时)`, time: Date.now() }, ...m])
					}}
				/>
			)}
		</Row>
	);
};
