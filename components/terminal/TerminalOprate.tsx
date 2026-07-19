'use client'
import { Button, Checkbox, Col, Divider, Form, Input, Row, Select, message } from "antd";
import React, { useEffect, useState } from "react";
import { getTerminal, SendProcotolInstructSet } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { ScheduleOpModal } from "@/components/scheduled-op/ScheduleOpModal";
import { pushDeviceEvent } from "@/lib/store/deviceEvents";

interface Props {
	mac: string;
}

export const TerminalOprate: React.FC<Props> = ({ mac }) => {
	const [dev, setDev] = useState("");
	const [oprate, setOprate] = useState("");

	// 「定时发送」checkbox (2026-06-30 决策 18)
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [scheduleChecked, setScheduleChecked] = useState(false);
	const [pendingItem, setPendingItem] = useState<Uart.OprateInstruct | null>(null);
	const [pendingProtocol, setPendingProtocol] = useState<string>("");

	const { data, loading } = usePromise(async () => {
		const { data } = await getTerminal(mac);
		return data.mountDevs || [];
	}, []);

	// 默认选中第一个 mount dev
	useEffect(() => {
		if (!dev && data.length > 0) {
			const first = data[0]
			if (first) {
				// eslint-disable-next-line react-hooks/set-state-in-effect
				setDev(first.mountDev)
			}
		}
	}, [data, dev])

	// dev 变化时, 默认 protocol = 当前选中 mountDev.protocol
	useEffect(() => {
		const found = data.find((el) => el.mountDev === dev);
		if (found?.protocol) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setPendingProtocol(found.protocol);
		}
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
		const { data: r, code, message: m } = await SendProcotolInstructSet(
			{ DevMac: mac, protocol: pendingProtocol, pid: md.pid, mountDev: dev },
			item
		);
		return { code, message: m, data: r }
	};

	const onSendClick = async () => {
		const key = "queryOprate";
		message.loading({ content: "正在处理", key });
		const item = await buildItem();
		if (!item) {
			message.destroy(key);
			return;
		}
		const sentText = `${dev}/${pendingProtocol}/${item.value}`
		pushDeviceEvent({
			kind: 'instruct_send',
			source: '指令',
			status: 'pending',
			text: sentText,
		});
		try {
			const r = await sendNow(item);
			const replyText = `code:${r.code}${r.message ? `  msg:"${r.message}"` : ''}${r.data != null ? '  data:' + JSON.stringify(r.data) : ''}`
			pushDeviceEvent({
				kind: 'instruct_reply',
				source: '指令',
				status: r.code === 200 ? 'success' : 'error',
				text: replyText,
				meta: r,
			});
			message.info({ content: "查询完成", key });
		} catch (e: any) {
			pushDeviceEvent({
				kind: 'instruct_reply',
				source: '指令',
				status: 'error',
				text: `异常: ${e?.message || e}`,
				meta: { error: String(e) },
			});
			message.error({ content: `异常: ${e?.message || e}`, key });
		}
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
		<div>
			<Divider plain>操作</Divider>
			<Form layout="inline">
				<Form.Item label="设备ID" style={{ marginBottom: 8 }}>
					<span style={{ fontFamily: 'var(--font-mono)' }}>{mac}</span>
				</Form.Item>
				<Form.Item label="设备" style={{ marginBottom: 8 }}>
					<Select
						value={dev || undefined}
						onChange={(v: any) => setDev(v as any)}
						loading={loading}
						style={{ minWidth: 160 }}
						placeholder="选择挂载设备"
					>
						{data.map((d) => (
							<Select.Option value={d.mountDev} key={d.mountDev}>
								{d.mountDev}
							</Select.Option>
						))}
					</Select>
				</Form.Item>
				<Form.Item label="指令" style={{ marginBottom: 8 }}>
					<Input
						value={oprate}
						onChange={(e) => setOprate(e.target.value)}
						placeholder="输入指令 (modbus无需输地址和校验码)"
						style={{ minWidth: 280 }}
					/>
				</Form.Item>
				<Form.Item style={{ marginBottom: 8 }}>
					<Checkbox
						checked={scheduleChecked}
						onChange={(e) => setScheduleChecked(e.target.checked)}
					>
						定时发送
					</Checkbox>
				</Form.Item>
				<Form.Item style={{ marginBottom: 8 }}>
					<Button
						onClick={onSendButtonClick}
						type="primary"
						disabled={!oprate}
					>
						{scheduleChecked ? '定时发送' : '立即发送'}
					</Button>
				</Form.Item>
			</Form>
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
						pushDeviceEvent({
							kind: 'action',
							source: '指令',
							status: 'success',
							text: `定时任务已创建: ${dev}/${pendingProtocol}/${pendingItem.value}`,
						})
					}}
				/>
			)}
		</div>
	);
};
