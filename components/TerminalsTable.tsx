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
import { TerminalInfo } from "./TerminalInfo";
import { TerminalMountDevs } from "./TerminalMountDevs";

/**
 * 显示设备查询间隔
 * @param param0
 * @returns
 */

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

interface props {
	title?: string;
	/**
	 * 如果有用户信息,就检索用户所属mac
	 */
	user?: string;
	/**
	 * 数据下载完成
	 */
	readyData?: (data: Uart.Terminal[]) => void;
	/**
	 * 额外的操作按钮（放置在"更新信息"按钮旁）
	 */
	extraActions?: React.ReactNode;
}

/**
 * 格式化表格显示设备
 * @param props
 * @returns
 */
export const TerminalsTable: React.FC<Omit<TableProps<Uart.Terminal>, "dataSource"> & props> = (props) => {
	const nav = useNav();

	// ─── Server-driven query state ─────────────────────────────────────────────
	const [pageReq, setPageReq] = useState<PaginationReq>({
		page: 1,
		pageSize: 20,
		needTotal: true,
		sortBy: "online",
		sortOrder: "desc",
	});
	const [searchFields, setSearchFields] = useState<Record<string, string>>({});
	const apiQuery: PaginationReq = { ...pageReq, search: searchFields };

	const {
		data,
		loading,
		fecth,
		setData,
	} = usePromise<V2ListResponse<Uart.Terminal>>(async () => {
		return props.user
			? await BindDev(props.user).then((el) => ({ items: el.data?.UTs || [], pagination: { total: el.data?.UTs?.length || 0, page: 1, pageSize: 9999 } } as any))
			: await getTerminals(undefined, apiQuery).then((el) => el.data);
	}, { items: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false } },
	[JSON.stringify(apiQuery)]);

	const terminals = data.items;

	useEffect(() => {
		if (props.readyData) props.readyData(terminals);
	}, [terminals]);

	/**
	 * 监听设备状态变更,有变更则更新列表
	 */
	useTerminalUpdate(
		terminals.map((el) => el.DevMac),
		(ts: any) => setData((prev: any) => ({ ...prev, items: typeof ts === "function" ? ts(prev.items) : ts })),
		(t: any) => {
			(notification as any).open({
				message: `设备状态变更`,
				description: `设备${t.name}状态:${t.online ? "在线" : "离线"}`,
				onClick: () => {
					CopyClipboard(t.DevMac);
					message.success(`已复制mac:${t.DevMac}到粘贴板`);
				},
			});
		}
	);

	const setOnlineSataus = async (mac: string, online: boolean) => {
		setTerminalOnline(mac, online).then(() => {
			fecth();
		});
	};

	const itoRemoteUrl = (mac: string) => {
		iotRemoteUrl(mac).then((el) => {
			if (el.code) {
				if (/remote_code=$/.test(el.data)) {
					message.error("远程调试地址获取失败,请确认设备是否联网和iot设置是否打开");
				} else window.open(el.data, "_blank");
			}
		});
	};

	const changeShare = (mac: string) => {
		changeShareApi(mac).then((el) => {
			if (el.code) {
				message.info("切换成功");
				fecth();
			} else {
				message.error(el.message);
			}
		});
	};

	const deleteRegisterTerminalm = (DevMac: string) => {
		Modal.confirm({
			content: `是否确定删除DTU:${DevMac} ??`,
			onOk: async () => {
				const key = "deleteRegisterTerminalm";
				message.loading({ content: '删除中...', key });
				const { code, data } = await deleteRegisterTerminal(DevMac);
				if (code) {
					message.success({ content: "删除成功", key });
					const index = terminals.findIndex((el) => el.DevMac === DevMac);
					terminals.splice(index, 1);
					setData((prev: any) => ({ ...prev, items: [...terminals] }) as any);
				} else {
					message.error({ content: `用户:${data} 已绑定设备`, key, duration: 3 });
				}
			},
		});
	};

	const initTerminalm = (DevMac: string) => {
		Modal.confirm({
			content: `是否确定初始化DTU:${DevMac} ??`,
			onOk: async () => {
				const key = "initTerminalm";
				const { code, data, message: msg } = await initTerminal(DevMac);
				if (code) {
					message.success({ content: `删除成功,耗时${data}ms`, key });
				} else {
					message.error({ content: msg, key });
				}
			},
		});
	};

	const iccdInfo = async (iccid: string, mac: string) => {
		const key = "iccdInfo" + Math.random();
		message.loading({ content: '查询中...', key });
		await IotQueryCardInfo(iccid);
		await IotQueryCardFlowInfo(iccid);
		await IotQueryIotCardOfferDtl(iccid);
		setTimeout(() => {
			message.info({ content: "ok", key });
		}, 5000);
	};

	const unbindDev = (mac: string, user?: string) => {
		if (user) {
			Modal.confirm({
				content: `是否删除用户[${user}]绑定设备{${mac}}?`,
				onOk() {
					delUserTerminal(user, mac).then(() => {
						message.success("解绑成功");
						fecth();
					});
				},
			});
		}
	};

	// ─── Server-side search handler ────────────────────────────────────────────
	const handleSearch = (kv: Record<string, string>) => {
		setSearchFields(prev => ({ ...prev, ...kv }));
		setPageReq(prev => ({ ...prev, page: 1 }));
	};

	return (
		<>
			<Space style={{ marginBottom: 16 }}>
				{props.extraActions}
				<Button type="primary" size="small" onClick={() => fecth()} icon={<SyncOutlined />}>
					更新信息
				</Button>
			</Space>
			<Table
				loading={loading}
				dataSource={generateTableKey(terminals, "DevMac")}
				size="small"
				scroll={{ x: 1000 }}
				pagination={{
					current: data.pagination.page,
					pageSize: data.pagination.pageSize,
					total: data.pagination.total,
					showTotal: (t) => `共 ${t} 条`,
					showSizeChanger: true,
				}}
				onChange={(pag, filters, sorter) => {
					const sq = extractServerTableQuery(pag, filters, sorter);
					setPageReq(prev => ({
						...prev,
						page: sq.page,
						pageSize: sq.pageSize,
						sortBy: sq.sortBy,
						sortOrder: sq.sortOrder,
						filters: sq.filters,
					} as PaginationReq));
				}}
				columns={
					[
						{
							dataIndex: "online",
							title: "状态",
							width: 70,
							...makeServerFilterProp<Uart.Terminal>("online", ["true", "false"]),
							sorter: true,
							defaultSortOrder: "descend",
							render: (val: any) => (
								<Tooltip title={val ? "在线" : "离线"}>
									<IconFont type={val ? "icon-zaixianditu" : "icon-lixian"} style={{ fontSize: 22 }} />
								</Tooltip>
							),
						},
						{
							dataIndex: "name",
							title: "名称",
							ellipsis: true,
							width: 180,
							...makeServerSearchProp<Uart.Terminal>("name", handleSearch),
						},
						{
							dataIndex: "DevMac",
							title: "mac",
							width: 140,
							...makeServerSearchProp<Uart.Terminal>("DevMac", handleSearch),
							render: (val: any) => <MyCopy value={val}></MyCopy>,
						},
						{
							dataIndex: "user",
							title: "用户",
							width: 140,
							ellipsis: true,
							...getColumnSearchProp<any>("user"),
						},
						{
							dataIndex: "ICCID",
							title: "ICCID",
							ellipsis: true,
							width: 120,
							...makeServerSearchProp<Uart.Terminal>("ICCID", handleSearch),
							render: (val: any) => val && <MyCopy value={val}></MyCopy>,
						},
						{
							dataIndex: "mountNode",
							title: "节点",
							width: 80,
							...makeServerSearchProp<Uart.Terminal>("mountNode", handleSearch),
						},
						{
							dataIndex: "PID",
							title: "型号",
							width: 80,
							...makeServerSearchProp<Uart.Terminal>("PID", handleSearch),
						},
						{
							title: "挂载设备",
							dataIndex: "mountDevs",
							width: 180,
							render: (val: Uart.TerminalMountDevs[]) => (
								<>
									{val &&
										val.map((el) => (
											<Tag color={el.online ? "green" : "warning"} key={el.pid}>
												{el.mountDev}
											</Tag>
										))}
								</>
							),
						},
						{
							dataIndex: "uptime",
							title: "更新时间",
							width: 165,
							sorter: true,
							render: (val: any) => dayjs(val || "1970-01-01").format("YYYY-MM-DD HH:mm:ss"),
						},
						{
							key: "oprate",
							title: "操作",
							width: 120,
							render: (_: any, t: any) => (
								<Space size={0} wrap>
									<Button type="link" onClick={() => nav("/root/node/Terminal/info/" + t.DevMac)}>
										查看
									</Button>
									<Dropdown
										menu={{
											items: [
												{ key: "1", label: `设置${t.online ? "离" : "在"}线`, onClick: () => setOnlineSataus(t.DevMac, !t.online) },
												{ key: "11", label: "远程配置", onClick: () => itoRemoteUrl(t.DevMac) },
												{ key: "111", label: "切换共享状态", onClick: () => changeShare(t.DevMac) },
												{ key: "2", label: "delete", onClick: () => deleteRegisterTerminalm(t.DevMac) },
												{ key: "3", label: "初始化", onClick: () => initTerminalm(t.DevMac) },
												...(t.ICCID ? [{ key: "4", label: "ICCID更新", onClick: () => iccdInfo(t.ICCID!, t.DevMac) }] : []),
												...(props.user ? [{ key: "5", label: "解绑设备", onClick: () => unbindDev(t.DevMac, props.user!) }] : [])
											]
										}}
									>
										<MoreOutlined />
									</Dropdown>
								</Space>
							),
						},
					] as ColumnsType<Uart.Terminal>
				}
				expandable={{
					expandedRowRender: (re, _, __, ex) => (
						<>
							<TerminalInfo terminal={re} ex={ex} />
							<TerminalMountDevs terminal={re} ex={ex} showTitle={false} InterValShow onChange={fecth}></TerminalMountDevs>
						</>
					),
					fixed: "left",
				}}
			></Table>
		</>
	);
};
