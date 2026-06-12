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
import { DevCard } from "@/components/data/devCard";

import { IconFont, devTypeIcon } from "@/components/common/IconFont";
import { MyCopy } from "@/components/common/MyCopy";
import { MyInput } from "@/components/common/MyInput";
import { TerminalAddMountDev } from "./TerminalAddMountDev";
import { TerminalDevPage } from "./TerminalDevPage";

export const TerminalIccidInfo: React.FC<{ iccid: string }> = (props) => {
	const { data, loading } = usePromise(
		async () => {
			const result = (await IotQueryIotCardOfferDtl(props.iccid)) as any;
			return result.data;
		},
		[],
		[props.iccid]
	);
	return (
		<Table
			loading={loading}
			dataSource={generateTableKey(data, "offerId")}
			columns={[
				{
					dataIndex: "offerId",
					key: "offerId",
					title: "订单Id",
				},
				{
					dataIndex: "orderTime",
					key: "orderTime",
					title: "订单时间",
				},
				{
					dataIndex: "offerName",
					key: "offerName",
					title: "订单名称",
				},
				{
					dataIndex: "effectiveTime",
					key: "effectiveTime",
					title: "起始时间",
					defaultSortOrder: "ascend",
					sorter: (a: any, b: any) => new Date(a.effectiveTime).getTime() - new Date(b.effectiveTime).getTime(),
				},
				{
					dataIndex: "expireTime",
					key: "expireTime",
					title: "结束时间",
				},
			]}
		></Table>
	);
};

export const TerminalBindUsers: React.FC<{ mac: string; share: boolean; ownerId: string; update: () => void }> = (prop) => {
	const nav = useNav();
	const [pageReq, setPageReq] = useState<PaginationReq>({ page: 1, pageSize: 20 });
	const {
		data,
		loading,
		setData,
		fecth,
	} = usePromise<V2ListResponse<Uart.UserInfo>>(async () => {
		const { data } = await getTerminalBindUsers(prop.mac, pageReq);
		return data;
	}, { items: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false } }, [pageReq.page, pageReq.pageSize]);
	const users = data.items;

	/**
	 * 更新单个用户信息
	 * @param user
	 */
	const updateOwner = async (user: string) => {
		setTerminalOwner(prop.mac, user).then(async (el) => {
			prop.update();
			fecth();
		});
	};

	/**
	 * 解绑用户设备
	 * @param mac
	 * @param user
	 */
	const unbindDev = (user: string) => {
		Modal.confirm({
			content: `是否删除设备设备{${prop.mac}}的绑定用户[${user}]?`,
			onOk() {
				delUserTerminal(user, prop.mac).then((el) => {
					message.success("解绑成功");
					fecth();
				});
			},
		});
	};
	return (
		<>
			<Divider plain>设备绑定用户 / {users.length}</Divider>
			<Table
				loading={loading}
				dataSource={generateTableKey(users, "user")}
				scroll={{ x: 1000 }}
				pagination={{
					current: data.pagination.page,
					pageSize: data.pagination.pageSize,
					total: data.pagination.total,
					onChange: (page, pageSize) => setPageReq({ ...pageReq, page, pageSize })
				}}
				columns={
					[
						{
							dataIndex: "avanter",
							title: "头像",
							width: 40,
							render: (img?: string) => <Avatar src={img} alt="i"></Avatar>,
						},
						{
							dataIndex: "user",
							title: "用户",
							width: 150,
							ellipsis: true,
							...getColumnSearchProp("user"),
							render: (val: any) => <MyCopy value={val} />,
						},
						{
							dataIndex: "name",
							title: "昵称",
							width: 120,
							ellipsis: true,
							...getColumnSearchProp("name"),
							render: (val: any) => <MyCopy value={val} />,
						},
						{
							dataIndex: "tel",
							title: "手机",
							width: 120,
							ellipsis: true,
							...getColumnSearchProp("tel"),
							render: (val: any) => <MyCopy value={val} />,
						},
						{
							dataIndex: "mail",
							title: "邮箱",
							width: 120,
							ellipsis: true,
							...getColumnSearchProp("mail"),
							render: (val: any) => <MyCopy value={val} />,
						},
						{
							dataIndex: "rgtype",
							title: "注册类型",
							width: 70,
							...tableColumnsFilter(users, "rgtype"),
							render: (val: any) => <Tag>{val}</Tag>,
						},
						{
							dataIndex: "userGroup",
							title: "用户组",
							width: 50,
							render: (val: any) => <Tag>{val}</Tag>,
						},
						{
							key: "gz",
							title: "wx状态",
							width: 60,
							render: (_: any, user: any) => (
								<>
									{user.wxId && <Tag color="blue">公众号</Tag>}
									{user.wpId && <Tag color="cyan">小程序</Tag>}
								</>
							),
						},
						{
							title: "操作",
							key: "operate",
							width: 120,
							render: (_: any, user: any) => (
								<>
									<Button type="link" onClick={() => nav(`/admin/node/user/info/${user.user}`)}>
										查看
									</Button>
									{prop?.share && prop?.ownerId !== user.user && (
										<>
											<Button type="link" onClick={() => updateOwner(user.user)}>
												设为所有者
											</Button>
											<Button type="link" onClick={() => unbindDev(user.user)}>
												删除
											</Button>
										</>
									)}
								</>
							),
						},
					] as ColumnsType<Uart.UserInfo>
				}
			/>
		</>
	);
};

/**
 * 显示mac绑定用户
 * @param param0
 * @returns
 */
export const TerminalUser: React.FC<{ mac: string }> = ({ mac }) => {
	const nav = useNav();

	const { data, loading } = usePromise(async () => {
		const { data } = await getTerminalUser(mac);
		return data;
	});
	return loading ? (
		<Spin />
	) : (
		<Button type="link" onClick={() => nav(`/admin/node/user/info/${data}`)}>
			<MyCopy value={data}></MyCopy>
		</Button>
	);
};

/**
 * 展示设备信息
 * @param param0
 * @returns
 */
