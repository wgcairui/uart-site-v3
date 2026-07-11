'use client'
import {
	CheckCircleFilled,
	WarningFilled,
	EyeFilled,
	DeleteFilled,
	LoadingOutlined,
	DownOutlined,
	CloudUploadOutlined,
	CloudDownloadOutlined,
} from '@ant-design/icons'
import {
	Tooltip,
	Button,
	Descriptions,
	Row,
	Col,
	Space,
	Popconfirm,
	message,
	Modal,
	Dropdown,
	ColProps,
} from 'antd'

import dayjs from "dayjs";
import React, { useEffect, useState } from "react";

import { devType } from "@/lib/utils/devImgSource";
import { getNodeInstructQueryMac } from '@/lib/api/fetchRoot'
import { delTerminalMountDev, refreshDevTimeOut } from '@/lib/api/fetch'
import { prompt } from "@/lib/utils/prompt";


import { useNav } from "@/lib/hooks/useNav";
import { usePromise } from "@/lib/hooks/usePromise";

import { DevCard } from "@/components/data/devCard";

import { devTypeIcon } from '@/components/common/IconFont'


import { TerminalAddMountDev } from "./TerminalAddMountDev";
import { TerminalDevPage } from "./TerminalDevPage";

/**
 * 显示设备查询间隔
 * @param param0
 * @returns
 */
const InterValToop: React.FC<{ mac: string; pid: number; show: boolean; minQueryLimit?: number }> = ({ mac, pid, show, minQueryLimit }) => {
	const {
		data: Interval,
		loading,
		fecth,
	} = usePromise(
		async () => {
			const { data } = await getNodeInstructQueryMac(mac, pid);
			return data;
		},
		0,
		[mac, pid]
	);

	useEffect(() => {
		const i = setInterval(() => {
			show && fecth();
		}, 3e4);
		return () => clearInterval(i);
	}, [show]);

	/**
	 * 刷新设备查询间隔
	 * @param mac
	 * @param pid
	 */
	const refreshInterval = () => {
		prompt({
			title: "设置设备查询间隔",
			placeholder: "输入间隔毫秒数,(值为x1000的倍数),未设置则为默认值",
			...(minQueryLimit !== undefined ? { value: minQueryLimit.toString() } : {}),
			onOk(val) {
				const n = Number(val);
				if (val && !Number.isNaN(n)) {
					if (n < 1000) {
						val = undefined;
					} else if (n % 1000 > 0) {
						val = String(n - (n % 1000));
					}
				}
				refreshDevTimeOut(mac, pid, Number(val)).then(() => {
					message.success("重置完成,等待数据刷新");
				});
				return true;
			},
		});
	};

	return loading ? (
		<LoadingOutlined />
	) : (
		<Tooltip title="查询间隔">
			<Dropdown
				menu={{
					items: [
						{ key: "refresh", label: "刷新", onClick: () => fecth() },
						{ key: "reset", label: "重置", danger: true, onClick: () => refreshInterval() },
					],
				}}
			>
				<a>
					{Interval / 1000}秒<DownOutlined />
				</a>
			</Dropdown>
		</Tooltip>
	);
};

interface infoProps {
	/**
	 * 设备数据
	 */
	terminal: Uart.Terminal & { user?: string };
	/**
	 * 是否一直展开
	 */
	ex: boolean;
	/**
	 * 是否显示标题
	 */
	showTitle?: boolean;

	/**
	 * 是否显示查询间隔
	 */
	InterValShow?: boolean;

	/**
	 *
	 */
	col?: ColProps;

	onChange?: (item?: Uart.Terminal) => void;
}

/**
 * 列出设备下挂载的子设备
 * @param param0
 * @returns
 */
export const TerminalMountDevs: React.FC<infoProps> = (props) => {
	const nav = useNav();

	const { terminal, ex, showTitle } = { showTitle: true, ...props };

	const [visible, setVisible] = useState(false);
	const [devModalVisible, setDevModalVisible] = useState(false);
	const [selectedDev, setSelectedDev] = useState<{ mac: string; pid: number } | null>(null);

	/**
	 * 删除挂载设备
	 * @param mac
	 * @param pid
	 */
	const delMountDev = (mac: string, pid: number) => {
		Modal.confirm({
			content: `确认删除挂载设备:${mac}/${pid} ?`,
			onOk() {
				const key = "delTerminalMountDev" + mac + pid;
				message.loading({ content: '加载中...', key });
				delTerminalMountDev(mac, pid).then(() => {
					message.success({ content: "删除成功", key });
					props.onChange && props.onChange(terminal);
				});
			},
		});
	};

	return (
		<Row>
			{terminal?.mountDevs &&
				terminal.mountDevs.map((el) => (
					<Col span={24} md={10} {...props.col} key={terminal.DevMac + el.pid}>
						<DevCard
							img={devType[el.Type]}
							title={
								<Space>
									<Tooltip title={el.online ? "在线" : "离线"}>{el.online ? <CheckCircleFilled style={{ color: "#10b981" }} /> : <WarningFilled style={{ color: "#f59e0b" }} />}</Tooltip>
									{`${el.mountDev} - PID: ${el.pid}`}
								</Space>
							}
							avatar={devTypeIcon[el.Type]}
							subtitle={
								<Descriptions size="small" column={1}>
									<Descriptions.Item label="protocol">{el.protocol}</Descriptions.Item>
									{"minQueryLimit" in el && <Descriptions.Item label="minQueryLimit">{(el as any).minQueryLimit}</Descriptions.Item>}
									{"lastEmit" in el && <Descriptions.Item label={<CloudUploadOutlined />}>{dayjs((el as any).lastEmit).format("YYYY-MM-DD HH:mm:ss")}</Descriptions.Item>}
									{"lastRecord" in el && <Descriptions.Item label={<CloudDownloadOutlined />}>{dayjs((el as any).lastRecord).format("YYYY-MM-DD HH:mm:ss")}</Descriptions.Item>}
								</Descriptions>
							}
							actions={[
								<Tooltip title="编辑查看" key="view">
									<EyeFilled style={{ color: "#67C23B" }} onClick={() => { setSelectedDev({ mac: terminal.DevMac, pid: el.pid }); setDevModalVisible(true); }} />
								</Tooltip>,

								<Tooltip title="删除" key="delete">
									<Popconfirm title={`确认删除设备[${el.mountDev}]?`} onConfirm={() => delMountDev(terminal.DevMac, el.pid)} onCancel={() => message.info("cancel")}>
										<DeleteFilled style={{ color: "#E6A23B" }} />
									</Popconfirm>
								</Tooltip>,
								props.InterValShow && <InterValToop mac={terminal.DevMac} pid={el.pid} show={ex} key="interval" />,
							]}
						></DevCard>
					</Col>
				))}
			<Col>
				<Button onClick={() => setVisible(true)} shape="round" type="primary">
					添加设备
				</Button>
				<TerminalAddMountDev mac={terminal.DevMac} visible={visible} {...(props.onChange !== undefined ? { onChange: props.onChange } : {})} onCancel={() => setVisible(false)} />
			</Col>
			<Modal title="设备详情" open={devModalVisible} onCancel={() => setDevModalVisible(false)} footer={null} width={900}>
				{selectedDev && <TerminalDevPage mac={selectedDev.mac} pid={selectedDev.pid} {...(props.terminal.user ? { user: props.terminal.user } : {})} />}
			</Modal>
		</Row>
	);
};

/**
 * 列出设备下挂载的子设备 - IOT卡信息
 * @param param0
 * @returns
 */
