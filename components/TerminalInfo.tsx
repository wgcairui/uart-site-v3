'use client'
import {
	CheckCircleFilled,
	WarningFilled,
	EyeFilled,
	DeleteFilled,
	LoadingOutlined,
	ReloadOutlined,
	MoreOutlined,
	SyncOutlined,
	DownOutlined,
	CloudUploadOutlined,
	CloudDownloadOutlined,
} from "@ant-design/icons";
import {
	Table,
	Tooltip,
	Button,
	Card,
	Descriptions,
	Tag,
	Divider,
	Row,
	Col,
	Space,
	Popconfirm,
	message,
	TableProps,
	Modal,
	Spin,
	Dropdown,
	notification,
	ColProps,
	Switch,
	Empty,
	Avatar,
} from "antd";
import { ColumnsType } from "antd/lib/table";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { PaginationReq, V2ListResponse } from "@/types";
import { devType } from "@/lib/utils/devImgSource";
import {
	BindDev,
	changeShareApi,
	deleteRegisterTerminal,
	delUserTerminal,
	getNodeInstructQueryMac,
	getTerminalBindUsers,
	getTerminals,
	getTerminalUser,
	initTerminal,
	IotQueryCardFlowInfo,
	IotQueryCardInfo,
	IotQueryIotCardOfferDtl,
	iotRemoteUrl,
	IotUpdateIccidInfo,
	modifyTerminalRemark,
	setTerminalOnline,
	setTerminalOwner,
} from "@/lib/api/fetchRoot";
import { delTerminalMountDev, getTerminal, modifyTerminal, refreshDevTimeOut } from "@/lib/api/fetch";
import { prompt } from "@/lib/utils/prompt";
import { generateTableKey, getColumnSearchProp, tableColumnsFilter, makeServerSearchProp, makeServerFilterProp, extractServerTableQuery } from "@/lib/utils/tableCommon";
import { CopyClipboard } from "@/lib/utils/util";
import { useNav } from "@/lib/hooks/useNav";
import { usePromise } from "@/lib/hooks/usePromise";
import { useTerminalUpdate } from "@/lib/hooks/useTerminalData";
import { DevCard } from "./devCard";

import { IconFont, devTypeIcon } from "./IconFont";
import { MyCopy } from "./myCopy";
import { MyInput } from "./myInput";
import { TerminalAddMountDev } from "./TerminalAddMountDev";
import { TerminalDevPage } from "./TerminalDevPage";
import { TerminalBindUsers, TerminalUser } from "./TerminalIccidInfo";

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
export const TerminalInfo: React.FC<infoProps> = (props) => {
	const {
		data: terminal,
		loading,
		fecth,
	} = usePromise(async () => {
		const { data } = await getTerminal(props.terminal.DevMac);
		return data;
	});

	/**
	 * 更新别名
	 * @param mac
	 * @param name
	 */
	const rename = (name?: string) => {
		const mac = terminal.DevMac;

		if (name) {
			modifyTerminal(mac, name).then((el) => {
				if (el.code) {
					message.success("更新成功");
				} else message.error("更新失败");
			});
		} else {
			message.error("名称不能为空");
		}
	};

	/**
	 * 更新设备备注
	 * @param mac
	 * @param remark
	 */
	const remark = (remark: string) => {
		const mac = terminal.DevMac;
		modifyTerminalRemark(mac, remark).then((el) => {
			if (el.code) {
				message.success("更新成功");
			} else message.error("更新失败");
		});
	};

	const updateIccidInfo = async (mac: string) => {
		await IotUpdateIccidInfo(mac);
		fecth();
	};

	return loading ? (
		<Empty>loading</Empty>
	) : (
		<Card>
			<Descriptions title={terminal.name} column={3}>
				<Descriptions.Item label="别名">
					<MyInput value={terminal.name} onSave={rename}></MyInput>
				</Descriptions.Item>
				<Descriptions.Item label="用户">
					<TerminalUser mac={terminal.DevMac} />
				</Descriptions.Item>
				<Descriptions.Item label="状态">
					<Switch {...(terminal.online !== undefined ? { checked: terminal.online } : {})}></Switch>
				</Descriptions.Item>
				<Descriptions.Item label="mac">{terminal.DevMac}</Descriptions.Item>
				<Descriptions.Item label="AT支持">
					<Tag color="cyan">{terminal.AT ? "支持" : "不支持"}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="ICCID">{terminal.ICCID}</Descriptions.Item>
				<Descriptions.Item label="PID">{terminal.PID}</Descriptions.Item>
				<Descriptions.Item label="设备IP">{terminal.ip}</Descriptions.Item>
				<Descriptions.Item label="设备定位">{terminal.jw}</Descriptions.Item>
				<Descriptions.Item label="挂载节点">{terminal.mountNode}</Descriptions.Item>
				<Descriptions.Item label="TCP端口">{terminal.port}</Descriptions.Item>
				<Descriptions.Item label="串口参数">{terminal.uart}</Descriptions.Item>
				<Descriptions.Item label="信号强度">{terminal.signal ?? 0}</Descriptions.Item>

				<Descriptions.Item label="iot">{terminal.iotStat}</Descriptions.Item>
				<Descriptions.Item label="Gver">{terminal.Gver}</Descriptions.Item>
				<Descriptions.Item label="ver">{terminal.ver}</Descriptions.Item>
				<Descriptions.Item label="共享状态" span={2}>{terminal.share ? "开启" : "关闭"}</Descriptions.Item>
				<Descriptions.Item label="更新时间" span={3}>
					{dayjs(terminal.uptime).format("YYYY-MM-DD H:m:s")}
				</Descriptions.Item>
				<Descriptions.Item label="备注" span={3}>
					<MyInput textArea {...(terminal.remark !== undefined ? { value: terminal.remark } : {})} onSave={remark}></MyInput>
				</Descriptions.Item>
			</Descriptions>
			<TerminalBindUsers mac={terminal.DevMac} share={terminal?.share ?? false} ownerId={(terminal as any)?.ownerId} update={fecth}></TerminalBindUsers>
		</Card>
	);
};

