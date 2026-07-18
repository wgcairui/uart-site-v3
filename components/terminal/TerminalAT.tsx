'use client'
import { LinkOutlined } from "@ant-design/icons";
import { Button, Card, Checkbox, Col, Collapse, Divider, Form, Input, Row, Space, Timeline, message } from "antd";
import dayjs from "dayjs";
import React, { useState } from "react";
import { sendATInstruct } from "@/lib/api/fetchRoot";

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

	const [msg, setMsg] = useState<{ type: boolean; text: string; time: number }[]>([]);

	const query = async () => {
		const key = "queryAt";
		message.loading({ content: "正在处理", key });
		const str = "+++AT+";
		setMsg((m) => [{ type: true, text: at, time: Date.now() }, ...m]);
		const { code, message: resMsg, data } = await sendATInstruct(mac, add ? str + at : at);
		setMsg((m) => [{ type: false, text: formatAtReply(code, resMsg, data), time: Date.now() }, ...m]);
		message.info({ content: "查询完成", key });
	};

	return (
		<Row gutter={36}>
			<Col span={12}>
				<Divider plain>
					<a href="https://besiv-uart.oss-cn-hangzhou.aliyuncs.com/pdf/48c5f8ca3d5eb514bbf9ca06220577af.pdf" target="_blank">
						<LinkOutlined />
						调试指令文档(仅支持4G版本)
					</a>
				</Divider>
				<Collapse defaultActiveKey={["get"]} ghost accordion items={Object.entries(content).map(([key, val]) => ({
					key,
					label: val.title,
					children: <>
						<Space wrap size="middle">
							{val.instructs.map((el, i) => (
								<Button shape="round" type="primary" key={i} onClick={() => setAt(el.value)}>
									{el.text}
								</Button>
							))}
						</Space>
						<Divider></Divider>
					</>,
				}))} />
			</Col>
			<Col span={12}>
				<Divider plain>操作</Divider>
				<Form>
					<Form.Item label="设备ID">{mac}</Form.Item>
					<Form.Item label="指令">
						<Input value={at} onChange={(e) => setAt(e.target.value)} placeholder="输入受支持的AT指令" />
					</Form.Item>
					<Form.Item label="Set">
						<Checkbox checked={add} onChange={(e) => setAdd(e.target.checked)}>
							添加[+++AT+]前辍
						</Checkbox>
					</Form.Item>
					<Form.Item>
						<Button onClick={() => query()} type="primary" disabled={!at}>
							发送
						</Button>
					</Form.Item>
				</Form>

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
