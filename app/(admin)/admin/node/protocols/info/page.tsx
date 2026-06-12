'use client'
import { CopyFilled, DeleteFilled, UploadOutlined } from "@ant-design/icons";
import { Button, Card, Checkbox, Descriptions, Empty, Form, Input, InputNumber, message, Modal, Select, Space, Spin, Table, Tabs, Tag, Upload } from "antd";
import { ColumnsType } from "antd/lib/table";
import { RcFile } from "antd/lib/upload";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getProtocols, modifyProtocolRemark, setProtocol, updateProtocol } from "@/lib/api/fetchRoot";
import { getProtocol } from "@/lib/api/fetch";
import { prompt } from "@/lib/utils/prompt";
import { generateTableKey } from "@/lib/utils/tableCommon";
import { MyInput } from "@/components/common/MyInput";
import { ProtocolAlarmStat } from "@/components/protocol/ProtocolAlarmStat";
import { ProtocolContant } from "@/components/protocol/ProtocolContant";
import { ProtocolOprate } from "@/components/protocol/ProtocolOprate";
import { ProtocolShowTag } from "@/components/protocol/ProtocolShowTag";
import { ProtocolThreshold } from "@/components/protocol/ProtocolThreshold";
import { usePromise } from "@/lib/hooks/usePromise";

interface ProtocolInstructFormResizeInputProps {
	protocolItemFun: (name: string) => Uart.protocolInstructFormrize | undefined;
	/**
	 * 指令单个参数
	 */
	re: Uart.protocolInstructFormrize;
	/**
	 * 修改指令触发
	 */
	onChange: (item?: Uart.protocolInstructFormrize) => void;
}

/**
 * 协议指令单个参数设置
 * @param param0
 * @returns
 */
const ProtocolInstructFormResizeInput: React.FC<ProtocolInstructFormResizeInputProps> = ({ protocolItemFun, re, onChange }) => {
	const [form] = Form.useForm<Uart.protocolInstructFormrize>();

	useEffect(() => {
		const m = protocolItemFun(re.name);
		if (m) {
			re.bl = m.bl;
			re.unit = m.unit;
		}
		form.setFieldsValue(re);
	}, [re]);

	const change = (_value: Partial<Uart.protocolInstructFormrize>, item: Uart.protocolInstructFormrize) => {
		const m = protocolItemFun(item.name);
		if (m) {
			item.bl = m.bl;
			item.unit = m.unit;
		}
		item.isState = Boolean(item.unit && /^{.*}$/.test(item.unit));
		onChange(item);
	};

	return (
		<Form layout="inline" initialValues={re} onValuesChange={change} size="small" form={form}>
			<Form.Item name="name" label="参数名">
				<Input></Input>
			</Form.Item>
			<Form.Item
				name="regx"
				label="分割"
				rules={[
					{
						type: "string",
						required: true,
						message: "error",
					},
					{
						pattern: /^[0-9]+\-[0-9]+$/,
					},
				]}
			>
				<Input></Input>
			</Form.Item>
			<Form.Item name="bl" label="系数" extra="">
				<Select>
					{[1, 0.1, 10, 100, 1000, 0.01, 0.001].map((el) => (
						<Select.Option value={el} key={el}>
							{el}
						</Select.Option>
					))}
				</Select>
			</Form.Item>
			<Form.Item
				name="unit"
				label="单位"
				rules={[
					{
						validator: (_, value) => {
							if (/^{/.test(value)) {
								if (/}$/.test(value)) return Promise.resolve();
								else return Promise.reject(new Error("大括号不完整"));
							} else {
								return Promise.resolve();
							}
						},
					},
				]}
			>
				<Input.TextArea autoSize />
			</Form.Item>
			<Form.Item>
				<DeleteFilled onClick={() => onChange()} />
			</Form.Item>
		</Form>
	);
};

interface ProtocolInstructFormResizeProps {
	protocolItemFun: (name: string) => Uart.protocolInstructFormrize | undefined;
	meta: Uart.protocolInstruct;
	/**
	 * 协议指令参数集合
	 */
	formResize: Uart.protocolInstructFormrize[];
	/**
	 * 参数发生改变
	 */
	onChange: (items: Uart.protocolInstructFormrize[]) => void;
}
/**
 * 显示参数列表
 * @param param0
 * @returns
 */
const ProtocolInstructFormResize: React.FC<ProtocolInstructFormResizeProps> = ({ meta, formResize, onChange, protocolItemFun }) => {
	const [data, setData] = useState(formResize);

	useEffect(() => {
		setData([...formResize]);
	}, [formResize]);

	/**
	 * 响应参数修改
	 * @param item
	 * @param index
	 */
	const argModify = (index: number, item?: Uart.protocolInstructFormrize) => {
		if (item) data.splice(index, 1, item && item);
		else data.splice(index, 1);
		setData([...data]);
		onChange(data);
		window.scrollBy(0, 1000);
	};

	/**
	 * 添加新的参数
	 */
	const addforResize = () => {
		const { regx, unit, bl } = data[data.length - 1] || { regx: `0-1`, unit: "V", bl: "0.1" };
		const [start, len] = regx!?.split("-").map(Number);
		data.push({
			name: "未命名" + ((start || 0) + (len || 0)),
			regx: ((start || 0) + (len || 0)) + "-" + (len || 0),
			bl,
			unit,
			isState: false,
		});
		setData([...data]);
		onChange(data);
	};
	return (
		<Card>
			<Space direction="vertical">
				{data.map((el, i) => (
					<ProtocolInstructFormResizeInput protocolItemFun={protocolItemFun} re={el} onChange={(item) => argModify(i, item)} key={el.name + i}></ProtocolInstructFormResizeInput>
				))}
				<Button type="primary" onClick={() => addforResize()}>
					添加参数
				</Button>
			</Space>
		</Card>
	);
};

interface props {
	Protocol: string;
}
/**
 * 协议指令修改页面
 * @param param0
 * @returns
 */
const ProtocolInstruct: React.FC<{ item: Uart.protocolInstruct; onChange: (item: Uart.protocolInstruct) => void; protocolItemFun: (name: string) => Uart.protocolInstructFormrize | undefined }> = ({
	item,
	onChange,
	protocolItemFun,
}) => {
	const [form] = Form.useForm<Uart.protocolInstruct>();

	const [formResize, setFormResize] = useState(item.formResize);

	const scriptStartBat = `const content = ('AA' + pid.toString(16).padStart(2, '0') + instruct).replace(/\s*/g, '');
    const num = 255 - (Buffer.from(content, 'hex').toJSON().data.reduce((pre, cur) => pre + cur))
    const crc = Buffer.allocUnsafe(2)
    crc.writeInt16BE(num, 0)
    return content + crc.slice(1, 2).toString('hex').padStart(2, '0')`;

	const scriptEndBat = ``;

	const change = (value: Partial<Uart.protocolInstruct>, item: Uart.protocolInstruct) => {
		if (Object.prototype.hasOwnProperty.call(value, "resize")) {
			if (value.resize) {
				// 分割字符串并刷选出有内容的 ["系统1吸气温度+1-2+0.1+℃","送风温度+3-2+0.1+℃"]
				const split = value.resize
					.replace(/(\n)/g, "")
					.split("&")
					.filter((el) => el !== "");
				// 继续分割数组，为单个单位 [[[系统1吸气温度],[1-2],[0.1],[℃]"],[[送风温度],[3-2],[0.1],[℃]]]
				const resize1 = split.map((el) => el.split("+"));
				// 构建数组对象 [{name:"aa",regx:"1-5",bl:"1",unit:"%"}]
				const formResizes = resize1.map(
					(el) =>
						({
							name: el[0]?.replace(/(\n)/g, "") || "",
							regx: el[1],
							bl: el[2] || "1",
							unit: el[3] || "",
							isState: /(^{.*}$)/.test(el[3] || ""), //el[3]?.includes("{")
						} as Uart.protocolInstructFormrize)
				);
				setFormResize([...formResizes]);
			}
		}
		finsh({ ...item, formResize });
	};

	/**
	 * 响应参数修改
	 * @param items
	 */
	const FormResizeChange = (items: Uart.protocolInstructFormrize[]) => {
		const str = items
			.map((el) => {
				return [el.name, el.regx, el.bl, el.unit].join("+");
			})
			.join("&\n");
		form.setFieldsValue({ resize: str, formResize: items });
		finsh(form.getFieldsValue());
	};

	/**
	 * 提交修改
	 * @param value
	 */
	const finsh = (value: Uart.protocolInstruct) => {
		value.formResize = value.formResize.map((el) => {
			el.isState = /^{.*}$/.test(el.unit || "");
			return el;
		});
		value.remark = value.remark || "";
		onChange(value);
		window.scrollTo({
			top: document.body.scrollHeight,
			behavior: "smooth", // 平滑滚动
		});
		message.success({ content: "保存指令更改", key: "saveInstruct" });
	};

	return (
		<Card>
			<Form initialValues={item} labelCol={{ span: 3 }} size="small" onValuesChange={change} form={form} onFinish={finsh}>
				<Form.Item name="name" label="name" hidden>
					<Input></Input>
				</Form.Item>
				<Form.Item name="remark" label="备注">
					<Input></Input>
				</Form.Item>
				<Form.Item name="resultType" label="结果集" extra="hex:数据解析为Uint,utf8:数据解析为字符,bit:数据解析为2进制,">
					<Select>
						{["utf8", "hex", "float", "short", "bit2"].map((el) => (
							<Select.Option value={el} key={el}>
								{el}
							</Select.Option>
						))}
					</Select>
				</Form.Item>
				<Form.Item name="isUse" label="启用" valuePropName="checked">
					<Checkbox></Checkbox>
				</Form.Item>
				<Form.Item name="noStandard" label="非标协议" valuePropName="checked" extra="非标准modbus协议">
					<Checkbox></Checkbox>
				</Form.Item>
				<Form.Item name="scriptStart" label="前处理脚本" extra="默认参数有两个,为设备pid as string和指令名称instruct as string,格式为:function(pid,instruct){},不编写默认以标准modbus处理">
					<Input.TextArea autoSize placeholder={scriptStartBat}></Input.TextArea>
				</Form.Item>
				<Form.Item
					name="scriptStart"
					label="后校验脚本"
					extra="默认参数有两个,为content as string指令和arr as Array<number>结果,使用Buffer.from()转换为buffer,编写脚本校验buffer，返回Boolen，格式:function(content,arr){}"
				>
					<Input.TextArea autoSize placeholder={scriptEndBat}></Input.TextArea>
				</Form.Item>
				<Form.Item name="shift" label="去头" valuePropName="checked" extra="处理结果buffer,删除buffer前n个字符,根据协议而定,标准modbus一般删除前置3个字节">
					<Checkbox />
				</Form.Item>
				<Form.Item name="shiftNum" label="去头数">
					<InputNumber />
				</Form.Item>
				<Form.Item name="pop" label="去尾" valuePropName="checked" extra="处理结果buffer,删除buffer后n个字符,根据协议而定,标准modbus一般删除后置2个字节">
					<Checkbox />
				</Form.Item>
				<Form.Item name="popNum" label="去尾数">
					<InputNumber />
				</Form.Item>
				<Form.Item name="isSplit" label="有分隔符" valuePropName="checked" extra="针对232协议,232有时会把状态读取为连接的二进制字符串,选择无分隔符可以解析,一般以空格符为分隔符">
					<Checkbox />
				</Form.Item>
				<Form.Item name="splitStr" label="分隔符" extra="针对232协议,232有时会把状态读取为连接的二进制字符串,选择无分隔符可以解析,一般以空格符/逗号为分隔符">
					<Select
						options={[
							{
								label: "空格",
								value: " ",
							},
							{
								label: "逗号",
								value: ",",
							},
						]}
					></Select>
				</Form.Item>
				<Form.Item
					name="resize"
					label="解析"
					extra="格式為:工作电压+1-2+1+(V|{A:离线,B:在线}),加&分隔符,第一位为参数名称,
                    第二位1-2为从地址第一位开始读取两位长度数据,
                    第三位为系数,获取的值乘系数为实际值,如果结果不是十进制,输入函数:(a,a/2-20)
                    第四位为单位或者解析对象"
					rules={[
						{
							validator: (_, val: string) => {
								const err: string[] = [];
								const res = val.split("&");

								res.forEach((el) => {
									const resize1 = el.split("+");
									// 如果拆解后长度不对
									if (resize1.length > 0 && resize1.length !== 4) {
										err.push(el + "(参数不全)");
										return;
									}
									// 构建数组对象 [{name:"aa",regx:"1-5",bl:"1",unit:"%"}]
									const { regx, bl, unit } = {
										name: resize1[0]?.replace(/(\n)/g, "") || "",
										regx: resize1[1],
										bl: resize1[2] || "1",
										unit: resize1[3] || "",
										isState: /(^{.*}$)/.test(resize1[3] || ""),
									} as Uart.protocolInstructFormrize;

									if (!resize1[1] || !/^[0-9]+\-[0-9]+$/.test(resize1[1])) {
										err.push(el + "(分隔符错误)");
									}

									if (!resize1[2] || (!/^\(.*\)$/.test(resize1[2]) && Number.isNaN(Number(resize1[2])))) {
										err.push(el + "(系数错误)");
									}

									if (!resize1[3] || (/^{/.test(resize1[3]) && !/}$/.test(resize1[3]))) {
										err.push(el + "(单位括号错误)");
									}
								});
								return err.length === 0 ? Promise.resolve() : Promise.reject(new Error(err.join(";")));
							},
						},
					]}
				>
					<Input.TextArea autoSize />
				</Form.Item>
				<Form.Item name="formResize" hidden>
					<Input></Input>
				</Form.Item>
				<Form.Item wrapperCol={{ offset: 3, span: 16 }}>
					<Button type="primary" htmlType="submit">
						提交修改
					</Button>
				</Form.Item>
			</Form>
			<ProtocolInstructFormResize protocolItemFun={protocolItemFun} meta={item} formResize={formResize} onChange={FormResizeChange}></ProtocolInstructFormResize>
		</Card>
	);
};

/**
 * 协议详情
 * @param param0
 * @returns
 */
const ProtocolDes: React.FC<props> = ({ Protocol }) => {
	const [instructs, setInstruct] = useState<Uart.protocolInstruct[]>([]);

	const { data, loading, fecth } = usePromise(async () => {
		const { data } = await getProtocol(Protocol);
		return data;
	});

	const { data: protocolInstructs } = usePromise(async () => {
		const { data } = await getProtocols();
		return (data.items || data as any).flatMap((i: any) => i.instruct || []).flatMap((i: any) => i.formResize || []);
	}, []);

	const protocolItemFun = useCallback(
		(name: string) => {
			if (!protocolInstructs) return undefined;
			return protocolInstructs.filter((el: any) => el?.name?.includes(name)).sort((a: any, b: any) => a.name.length - b.name.length)[0] as Uart.protocolInstructFormrize | undefined;
		},
		[protocolInstructs]
	);

	useEffect(() => {
		if (data && data.instruct) {
			setInstruct(data.instruct);
		}
	}, [data]);

	/**
	 * 修改备注
	 * @param val
	 */
	const remark = (val: string) => {
		modifyProtocolRemark(data.Protocol, val).then(() => {
			fecth();
			message.success("remark update");
		});
	};

	/**
	 * 添加指令
	 */
	const addInstruct = () => {
		prompt({
			title: "输入指令字符",
			onOk(value) {
				if (value) {
					if (instructs.some((el) => el.name === value)) {
						Modal.info({ content: "指令字符重复" });
					} else {
						modifyInstruct({
							name: value,
							resultType: "hex",
							shift: false,
							shiftNum: 0,
							pop: false,
							popNum: 0,
							isSplit: false,
							resize: "",
							formResize: [],
							isUse: true,
							noStandard: false,
							scriptStart: "",
							scriptEnd: "",
						});
					}
				}
			},
		});
	};

	/**
	 * 保存协议
	 */
	const saveProtocol = () => {
		const loading = message.loading("加载中...");
		setProtocol(data.Type, data.ProtocolType, data.Protocol, instructs).then((el) => {
			loading();
			message.success("ok");
			fecth();
		});
	};

	/**
	 * 修改协议指令
	 * @param item
	 */
	const modifyInstruct = (item: Uart.protocolInstruct) => {
		const index = instructs.findIndex((el) => el.name === item.name);
		if (index !== -1) {
			instructs.splice(index, 1, item);
		} else {
			instructs.unshift(item);
		}
		setInstruct([...instructs]);
	};

	/**
	 * 删除指令
	 * @param name
	 */
	const deleteInstruct = (name: string) => {
		Modal.confirm({
			content: `确认删除指令:${name}?`,
			onOk() {
				const index = instructs.findIndex((el) => el.name === name);
				if (index !== -1) {
					instructs.splice(index, 1);
					setInstruct([...instructs]);
				}
			},
		});
	};

	/**
	 * 复制指令
	 * @param re
	 */
	const copyInstruct = (re: Uart.protocolInstruct) => {
		prompt({
			title: "新的指令名称",
			onOk(val) {
				if (val) {
					setInstruct([{ ...re, name: val }, ...instructs]);
				}
			},
		});
	};

	return loading ? (
		<Spin />
	) : !data ? (
		<Empty description="未能加载协议详情" />
	) : (
		<>
			<Descriptions>
				<Descriptions.Item label="名称">{data.Protocol}</Descriptions.Item>
				<Descriptions.Item label="类型">{data.Type}</Descriptions.Item>
				<Descriptions.Item label="设备类型">{data.ProtocolType}</Descriptions.Item>
				<Descriptions.Item label="备注" span={3}>
					<MyInput {...(data.remark !== undefined ? { value: data.remark } : {})} onSave={remark} textArea></MyInput>
				</Descriptions.Item>
				<Descriptions.Item>
					<Space>
						<Button size="small" type="primary" onClick={() => addInstruct()}>
							添加指令
						</Button>
						<Button size="small" type="primary" onClick={() => saveProtocol()}>
							保存协议
						</Button>
					</Space>
				</Descriptions.Item>
			</Descriptions>
			{data.instruct && (
				<Table
					dataSource={generateTableKey(instructs, "name")}
					pagination={false}
					size="small"
					columns={
						[
							{
								dataIndex: "name",
								title: "名称",
							},
							{
								dataIndex: "isUse",
								title: "启用",
								render: (val) => <Tag color={val ? "blue" : "red"}>{val ? "是" : "否"}</Tag>,
							},
							{
								dataIndex: "noStandard",
								title: "非标",
								render: (val) => <Tag color={val ? "red" : "blue"}>{val ? "是" : "否"}</Tag>,
							},
							{
								dataIndex: "resultType",
								title: "转换器",
							},
							{
								dataIndex: "shift",
								title: "去头",
								render: (val, re) => (val ? "是/" + re.shiftNum : "否"),
							},
							{
								dataIndex: "pop",
								title: "去尾",
								render: (val, re) => (val ? "是/" + re.popNum : "否"),
							},
							{
								dataIndex: "remark",
								title: "备注",
							},
							{
								key: "len",
								title: "参数数",
								render: (_, val) => val.formResize.length,
							},
							{
								key: "oprate",
								title: "操作",
								render: (_, re) => (
									<Space>
										<CopyFilled onClick={() => copyInstruct(re)}></CopyFilled>
										<DeleteFilled onClick={() => deleteInstruct(re.name)}></DeleteFilled>
									</Space>
								),
							},
						] as ColumnsType<Uart.protocolInstruct>
					}
					expandable={{
						expandedRowRender: (re) => <ProtocolInstruct protocolItemFun={protocolItemFun} item={re} onChange={modifyInstruct}></ProtocolInstruct>,
					}}
				></Table>
			)}
		</>
	);
};

/**
 * 协议详情
 * @param param0
 * @returns
 */
const ProtocolDesLocal: React.FC<{ Protocol: Uart.protocol }> = ({ Protocol }) => {
	const data = Protocol;

	return (
		<>
			<Descriptions>
				<Descriptions.Item label="名称">{data.Protocol}</Descriptions.Item>
				<Descriptions.Item label="类型">{data.Type}</Descriptions.Item>
				<Descriptions.Item label="设备类型">{data.ProtocolType}</Descriptions.Item>
				<Descriptions.Item label="备注">{data.remark}</Descriptions.Item>
			</Descriptions>
			{data.instruct && (
				<Table
					dataSource={generateTableKey(data.instruct, "name")}
					pagination={false}
					size="small"
					columns={
						[
							{
								dataIndex: "name",
								title: "名称",
							},
							{
								dataIndex: "isUse",
								title: "启用",
								render: (val) => <Tag color={val ? "blue" : "red"}>{val ? "是" : "否"}</Tag>,
							},
							{
								dataIndex: "noStandard",
								title: "非标",
								render: (val) => <Tag color={val ? "red" : "blue"}>{val ? "是" : "否"}</Tag>,
							},
							{
								dataIndex: "resultType",
								title: "转换器",
							},
							{
								dataIndex: "shift",
								title: "去头",
								render: (val, re) => (val ? "是/" + re.shiftNum : "否"),
							},
							{
								dataIndex: "pop",
								title: "去尾",
								render: (val, re) => (val ? "是/" + re.popNum : "否"),
							},
							{
								dataIndex: "remark",
								title: "备注",
							},
							{
								key: "len",
								title: "参数数",
								render: (_, val) => val.formResize.length,
							},
						] as ColumnsType<Uart.protocolInstruct>
					}
					expandable={{
						expandedRowRender: (re) =>
							re.formResize && (
								<Table
									dataSource={generateTableKey(re.formResize, "name")}
									columns={
										[
											{
												key: "id",
												title: "ID",
												render: (_, __, i) => ++i,
											},
											{
												dataIndex: "name",
												title: "name",
											},
											{
												dataIndex: "regx",
												title: "regx",
											},
											{
												dataIndex: "bl",
												title: "系数",
											},
											{
												dataIndex: "unit",
												title: "单位",
											},
										] as ColumnsType<Uart.protocolInstructFormrize>
									}
								></Table>
							),
					}}
				></Table>
			)}
		</>
	);
};

/**
 * 更新协议
 * @param param0
 * @returns
 */
const ProtocolUpload: React.FC<props> = (props) => {
	const [protocol, setProtocol] = useState<Uart.protocol>();

	const upfile = (file: RcFile, FileList: RcFile[]) => {
		console.log({ file, FileList });
		const reader = new FileReader();
		reader.readAsText(file);
		reader.onload = (event) => {
			const [result] = JSON.parse(event.target?.result as string) as Uart.protocol[];
			if (typeof result === "object" && Object.prototype.hasOwnProperty.call(result, "Protocol")) {
				if (result.Protocol === props.Protocol) {
					setProtocol(result);
				} else {
					message.warning("协议名称不一致");
				}
			} else {
				message.error("协议文件出错");
			}
		};
		return false;
	};

	const updateP = () => {
		Modal.confirm({
			content: "确定使用本地文件配置更新云端协议配置吗?",
			onOk() {
				const loading = message.loading("更新中...");
				updateProtocol(protocol!).then(() => {
					loading();
					Modal.info({
						content: "更新完成,更新页面查看最新的协议配置",
					});
				});
			},
		});
	};

	return (
		<Space direction="vertical">
			<Upload beforeUpload={upfile}>
				<Button icon={<UploadOutlined />}>Select File</Button>
			</Upload>
			{protocol && (
				<Card>
					<Button type="primary" onClick={() => updateP()}>
						更新协议
					</Button>
					<ProtocolDesLocal Protocol={protocol} />
				</Card>
			)}
		</Space>
	);
};

const ProtocolInfo: React.FC = () => {
	const query = useSearchParams();
	const router = useRouter();

	const Protocol = query.get("Protocol");

	if (!Protocol) {
		return <Empty description="缺少协议参数 (Protocol)" />;
	}

	return (
		<>
			<Space style={{ paddingBottom: 16 }} align="baseline">
				<Button onClick={() => router.back()}>返回</Button>
				<h2>{Protocol}</h2>
			</Space>
			<Tabs items={[
				{ key: 'info', label: '详细信息', children: <ProtocolDes Protocol={Protocol}></ProtocolDes> },
				{ key: 'oprate', label: '操作指令', children: <ProtocolOprate protocolName={Protocol} /> },
				{ key: 'Constant', label: '常量配置', children: <ProtocolContant protocolName={Protocol}></ProtocolContant> },
				{ key: 'show', label: '显示参数', children: <ProtocolShowTag protocolName={Protocol}></ProtocolShowTag> },
				{ key: 'Threld', label: '阈值配置', children: <ProtocolThreshold protocolName={Protocol}></ProtocolThreshold> },
				{ key: 'stat', label: '状态配置', children: <ProtocolAlarmStat protocolName={Protocol}></ProtocolAlarmStat> },
				{ key: 'localFileUpload', label: '本地文件更新', children: <ProtocolUpload Protocol={Protocol}></ProtocolUpload> },
			]} />
		</>
	);
};

export default function Page() {
	return (
		<Suspense fallback={<Spin />}>
			<ProtocolInfo />
		</Suspense>
	);
}
