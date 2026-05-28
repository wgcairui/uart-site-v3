'use client'

import React, { useEffect, useState } from "react";
import { UserOutlined } from "@ant-design/icons";
import { Form, Input, Layout, Menu } from "antd";
import { SizeType } from "antd/es/config-provider/SizeContext";

const { Header, Content, Sider } = Layout;

const idCardRegex = /\b\d{17}[\dXx]\b/;
const phoneRegex = /1[3-9]\d{9}/;
const licensePlateRegex = /[\u4e00-\u9fa5]{1}[A-Z]{1}[A-Z_0-9]{5}/;
const gLicensePlateRegex = /[\u4e00-\u9fa5]{1}[A-Z]{1}[A-Z_0-9]{4}[\u4e00-\u9fa5]/;
const nameRegex = /[\u4e00-\u9fa5]{2,4}/;

function rp(text: string, regex: RegExp) {
	const [match] = text.match(regex) ?? [""];
	text = text.replace(match, "");
	return match;
}

const items = [
	{
		key: "format address",
		icon: React.createElement(UserOutlined),
		label: `格式化地址工具`,
	},
];

const Wei: React.FC = () => {
	const filterTextCache = (typeof window !== 'undefined' ? localStorage.getItem("filterText") : null) ?? "车号|挂车|电话|身份证";

	const origData = `车号鲁GAX827，
挂车，鲁GG5M1超
李振超，
电话15621627002，
身份证号370784198507167615
吨位33.5吨以内
奎屯2库到滨州纺织厂470元\吨`;

	const [formatAddress, setFormatAddress] = useState("");
	const [form] = Form.useForm();

	useEffect(() => {
		form.setFieldValue("origData", origData);
		form.submit();
	}, []);

	const onFormLayoutChange = (_: any, value: { origData: string; filterText: string }) => {
		if (value.filterText && value.filterText !== filterTextCache) {
			localStorage.setItem("filterText", value.filterText);
		}
		if (!value.origData) {
			form.setFieldValue("origData", "");
			return;
		}
		const exclude = value.filterText.split("|");
		const excludeReg = new RegExp(`(${exclude.join("|")})`, "g");
		let text = value.origData.replace(excludeReg, "");

		form.setFieldValue("origData", text);
		const idCard = rp(text, idCardRegex);
		const phone = rp(text, phoneRegex);
		const license = rp(text, licensePlateRegex);
		const gLicense = rp(text, gLicensePlateRegex);
		const name = rp(text, nameRegex);
		let str = "";
		if (license) {
			str += `车号:${license}\n`;
		}
		if (gLicense) {
			str += `挂车号:${gLicense}\n`;
		}
		if (name) {
			str += `司机姓名:${name}\n`;
		}
		if (idCard) {
			str += `身份证号码:${idCard}\n`;
		}
		if (phone) {
			str += `电话:${phone}\n`;
		}
		setFormatAddress(str ?? "未匹配到信息");
	};

	return (
		<Layout style={{ height: "100%" }}>
			<Sider breakpoint="lg" collapsedWidth="0">
				<div className="demo-logo-vertical" />
				<Menu theme="dark" mode="inline" defaultSelectedKeys={["4"]} items={items} />
			</Sider>
			<Layout>
				<Header style={{ padding: 0 }} />
				<Content style={{ margin: "24px 16px 0" }}>
					<Form
						labelCol={{ span: 6 }}
						initialValues={{ filterText: filterTextCache }}
						wrapperCol={{ span: 14 }}
						layout="horizontal"
						onValuesChange={onFormLayoutChange}
						size={"large" as SizeType}
						form={form}
					>
						<Form.Item
							label="需要格式化的文档"
							name="origData"
							normalize={(v: string) => {
								return v.replace(/(，)/g, "\n").replace(/\n/g, " ");
							}}
						>
							<Input.TextArea autoSize={{ minRows: 10 }} />
						</Form.Item>
						<Form.Item label="需要过滤的文字" name="filterText" extra="过滤文档中匹配的文字,以｜分隔">
							<Input.TextArea autoSize={{ minRows: 5 }} />
						</Form.Item>
						<Form.Item label="已格式化的文档">
							<Input.TextArea value={formatAddress} autoSize={{ minRows: 10 }} />
						</Form.Item>
					</Form>
				</Content>
			</Layout>
		</Layout>
	);
};

export default Wei;
