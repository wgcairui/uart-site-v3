'use client'
import { LinkOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Checkbox, Col, Collapse, Divider, Form, Input, Row, Space, Tag, message } from "antd";
import React, { useMemo, useState } from "react";
import { sendATInstruct } from "@/lib/api/fetchRoot";
import { pushDeviceEvent } from "@/lib/store/deviceEvents";

interface Props {
	mac: string;
}

/**
 * formatAtReply · AT 指令回包 4 段格式化
 *
 * API 返回 universalResult<Array<{ok, msg, upserted: Buffer}>>
 * - code: HTTP/request 级别
 * - data[].ok: 4G 模块 AT 级别 ok (1=成功, 0=失败)
 * - data[].msg: AT 指令返回的文本 (如 GSLQ "1,23")
 * - data[].upserted: Mongo Buffer 序列化 {type, data: number[]}
 *   解码后是模块原始回包 (如 "+ok=1,23")
 *
 * 4 段都展示, 中间双空格分隔, 任一字段缺失则跳过该段。
 */
function formatAtReply(code: number, resMsg: string, data: any): string {
	const first = Array.isArray(data) ? data[0] : data
	const atOk = first?.ok
	const atMsg = first?.msg
	const buf = first?.upserted
	const raw =
		buf && Array.isArray(buf.data) && buf.data.length > 0
			? String.fromCharCode(...buf.data)
			: undefined
	const parts: (string | null)[] = [
		`code:${code}`,
		atOk !== undefined ? `at_ok:${atOk}` : null,
		atMsg ? `msg:"${atMsg}"` : resMsg ? `msg:"${resMsg}"` : null,
		raw ? `raw:"${raw}"` : null,
	]
	return parts.filter(Boolean).join('  ')
}

export const TerminalAT: React.FC<Props> = ({ mac }) => {
	const content = {
		get: {
			title: "查询",
			instructs: [
				{ text: "查询主机名称", value: "HOST" },
				{ text: "软件版本", value: "VER" },
				{ text: "GPRS版本", value: "GVER" },
				{ text: "定制软件版本号", value: "APPVER" },
				{ text: "查询串口参数", value: "UART=1" },
				{ text: "注册包配置", value: "NREGDT=A" },
				{ text: "基站定位", value: "LOCATE=1" },
				{ text: "GPS定位", value: "LOCATE=2" },
				{ text: "查询 GPRS 信号强度", value: "GSLQ" },
				{ text: "查询 GSM 状态", value: "GSMST" },
				{ text: "查询模块 ICCID 码", value: "ICCID" },
				{ text: "查询模块 IMEI 码", value: "IMEI" },
				{ text: "查询 SIM 卡 IMSI 号", value: "IMSI" },
				{ text: "IOT状态", value: "IOTEN" },
				{ text: "UserID", value: "IOTUID" },
				{ text: "模块型号", value: "PID" },
				{ text: "打印调试信息输出", value: "NDBGL" },
				{ text: "查询APN", value: "APN" },
				{ text: "查询TCP超时", value: "TCPTO=A" },
				{ text: "查询网络协议参数", value: "NETP=A" },
				{ text: "前导字符", value: "CMDPW" },
				{ text: "APN信息", value: "APN" },
			],
		},
		set: {
			title: "设置",
			instructs: [
				{ text: "设置波特率2400", value: "UART=1,2400,8,1,NONE,NFC" },
				{ text: "设置波特率4800", value: "UART=1,4800,8,1,NONE,HD" },
				{ text: "设置波特率9600", value: "UART=1,9600,8,1,NONE,HD" },
				{ text: "设置波特率19200", value: "UART=1,19200,8,1,NONE,HD" },
				{ text: "设置波特率115200", value: "UART=1,115200,8,1,NONE,HD" },
				{ text: "关闭IOT", value: "IOTEN=off" },
				{ text: "临时打开IOT 1小时", value: "IOTEN=active,60" },
				{ text: "打开IOT 全天", value: "IOTEN=on,00:00,23:59" },
				{ text: "固件更新(url必填)", value: "UPGRADE=url" },
				{ text: "设置APN(APN必填)", value: "APN=apn" },
			],
		},
		control: {
			title: "控制",
			instructs: [
				{ text: "保存当前参数为用户默认参数", value: "CFGTF" },
				{ text: "恢复用户默认参数", value: "RELD" },
				{ text: "恢复出厂参数", value: "FCLR" },
				{ text: "硬重启", value: "Z" },
			],
		},
	};

	const [at, setAt] = useState("");
	const [add, setAdd] = useState(true);
	const [search, setSearch] = useState("");

	const query = async () => {
		const key = "queryAt";
		message.loading({ content: "正在处理", key });
		const str = "+++AT+";
		const sentText = add ? str + at : at;
		pushDeviceEvent({
			kind: 'at_send',
			source: 'AT',
			status: 'pending',
			text: sentText,
		});
		try {
			const { code, message: resMsg, data } = await sendATInstruct(mac, sentText);
			const replyText = formatAtReply(code, resMsg, data);
			pushDeviceEvent({
				kind: 'at_reply',
				source: 'AT',
				status: code === 200 ? 'success' : 'error',
				text: replyText,
				meta: { code, resMsg, data },
			});
			message.info({ content: "查询完成", key });
		} catch (e: any) {
			pushDeviceEvent({
				kind: 'at_reply',
				source: 'AT',
				status: 'error',
				text: `异常: ${e?.message || e}`,
				meta: { error: String(e) },
			});
			message.error({ content: `异常: ${e?.message || e}`, key });
		}
	};

	// 过滤 AT 指令 (按 search 模糊匹配 text 或 value)
	const filterInstructs = (instructs: typeof content.get.instructs) => {
		if (!search.trim()) return instructs
		const q = search.toLowerCase()
		return instructs.filter(
			(it) => it.text.toLowerCase().includes(q) || it.value.toLowerCase().includes(q)
		)
	}

	const totalCount = content.get.instructs.length + content.set.instructs.length + content.control.instructs.length

	return (
		<div>
			<Row gutter={12} align="middle" style={{ marginBottom: 8 }}>
				<Col flex="auto">
					<Input
						prefix={<SearchOutlined />}
						placeholder={`搜索 ${totalCount} 个 AT 指令 (按名称或指令内容)`}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						allowClear
					/>
				</Col>
				<Col>
					<Tag style={{ margin: 0 }}>{totalCount} 指令</Tag>
				</Col>
			</Row>
			<Collapse
				defaultActiveKey={["get"]}
				ghost
				accordion
				items={Object.entries(content).map(([key, val]) => {
					const filtered = filterInstructs(val.instructs)
					return {
						key,
						label: (
							<span>
								{val.title} ({filtered.length}/{val.instructs.length})
							</span>
						),
						children: filtered.length === 0 ? (
							<div style={{ color: 'var(--ink-500)', fontSize: 12, padding: 8 }}>无匹配</div>
						) : (
							<>
								<Space wrap size="middle">
									{filtered.map((el, i) => (
										<Button shape="round" type="primary" key={i} onClick={() => setAt(el.value)}>
											{el.text}
										</Button>
									))}
								</Space>
								<Divider />
							</>
						),
					}
				})}
			/>
			<Divider plain>
				<a href="https://besiv-uart.oss-cn-hangzhou.aliyuncs.com/pdf/48c5f8ca3d5eb514bbf9ca06220577af.pdf" target="_blank">
					<LinkOutlined />
					调试指令文档(仅支持4G版本)
				</a>
			</Divider>
			<Form layout="inline">
				<Form.Item label="设备ID" style={{ marginBottom: 8 }}>
					<span style={{ fontFamily: 'var(--font-mono)' }}>{mac}</span>
				</Form.Item>
				<Form.Item label="指令" style={{ marginBottom: 8 }}>
					<Input
						value={at}
						onChange={(e) => setAt(e.target.value)}
						placeholder="输入受支持的AT指令"
						style={{ minWidth: 200 }}
					/>
				</Form.Item>
				<Form.Item label="Set" style={{ marginBottom: 8 }}>
					<Checkbox checked={add} onChange={(e) => setAdd(e.target.checked)}>
						添加[+++AT+]前辍
					</Checkbox>
				</Form.Item>
				<Form.Item style={{ marginBottom: 8 }}>
					<Button onClick={() => query()} type="primary" disabled={!at}>
						发送
					</Button>
				</Form.Item>
			</Form>
		</div>
	);
};
