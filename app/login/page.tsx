'use client'

import React, { useEffect, useState } from "react";
import { AES } from "crypto-js";
import { Layout, Image, Dropdown, Row, Col, Card, Tabs, Form, Input, Button, message, Spin } from "antd";
import { UserOutlined, LockOutlined, WechatFilled } from "@ant-design/icons";
import { IconFont } from "@/components/common/IconFont";
import { getAuthUser, getLoginHash, login as loginApi } from "@/lib/api/fetch";

import { useNav } from "@/lib/hooks/useNav";
import { setToken, getToken } from "@/lib/utils/token";
import { useUserStore } from "@/lib/store/userStore";

// ⚠️ 移除内层 ConfigProvider (cairui 21:00 拍 Option A hotfix #1):
// 之前 page 内嵌套 ConfigProvider (locale={isZh ? Zh : En}) 覆盖了外层
// AntdProvider 的 v2 紫主题 (Theme Token 不继承, fallback 到 antd 默认 #1677ff).
// 当前表单全中文, locale switcher 仅切 antd 内部消息, 跟表单 label 文案不一致,
// 先去掉等后续做完整 i18n (state 保留, 不破 UI).
import "./login.css";

const Login: React.FC = () => {
	const navi = useNav();

	const [loading, setLoading] = useState(true);

	const [isZh, setZh] = useState(true);

	/**
	 * tab index
	 */
	const [tabdefaultActiveKey, setTabDefaultActiveKey] = useState<"wx_qr" | "login">("wx_qr");

	const [loginLoading, setLoginLoading] = useState(false);
	const [devLoginLoading, setDevLoginLoading] = useState(false);

	// 开发环境一键管理员登录 — 仅当 .env.local 设了 NEXT_PUBLIC_HAS_DEV_CREDS=1 才显示按钮
	// 真正的密码在 server-side route.ts (app/api/dev-login/route.ts) 读, 永不进 client bundle
	const hasDevCreds = process.env.NEXT_PUBLIC_HAS_DEV_CREDS === '1'

	const onDevLogin = async () => {
		setDevLoginLoading(true)
		try {
			const res = await fetch('/api/dev-login', { method: 'POST' })
			const json: any = await res.json().catch(() => ({}))
			if (res.ok && json?.code === 200) {
				message.success(`dev 登录成功: ${json.data?.user || 'admin'}`)
				window.location.href = json.data?.redirect || '/admin'
			} else {
				message.error(`dev 登录失败: ${json?.message || res.status}`)
			}
		} catch (e: any) {
			message.error(`dev 登录出错: ${e?.message || String(e)}`)
		} finally {
			setDevLoginLoading(false)
		}
	}

	const checkUser = async () => {
		if (!getToken()) return false;
		try {
			const {
				data: { user, userGroup },
			} = await getAuthUser();
			if (user) {
				navi(["user", "test"].includes(userGroup) ? "/main" : "/admin");
				return true;
			} else {
				return false;
			}
		} catch (error) {
			console.log(error);
			return false;
		}
	};

	/**
	 * 判断用户屏幕尺寸,如果是小尺寸屏幕,禁用微信登录
	 * 否则加载微信登录qr
	 */
	useEffect(() => {
		checkUser().then((el) => {
			setLoading(false);
			if (!el) {
				if (window.innerWidth < 476) {
					setTabDefaultActiveKey("login");
				}
				const script = document.createElement("script");
				script.src = "https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js";
				script.async = false;
				document.body.append(script);
				script.onload = () => {
					// 马上执行是找不到wx对象的,需要异步到下一次循环
					setTimeout(() => {
						(window as any).WxLogin({
							// self_redirect: true,
							id: "wxlogin",
							appid: "wx2afee5b1777448cf",
							scope: "snsapi_login",
							redirect_uri: encodeURI("https://uart.ladishb.com/loginwx"),
							state: "e0bwU6jnO2KfIuTgBQNDVxlsy7iGtoF3A8rWpSCM5RzZ1dmYJcLHqPhXav4Ek9lIC6P4cULfktXj5Wcwa3GcCBCYRMWidUzZyJyTqu",
							href: "https://besiv-uart.oss-cn-hangzhou.aliyuncs.com/css/00137087c1c679c134236bbd38f41220.css",
							width: "300",
							height: "220",
						});
					}, 0);
				};
			}
		});
	}, []);

	/**
	 * 提交登录
	 * @param values
	 */
	const onFinish = async ({ username, password }: { username: string; password: string }) => {
		setLoginLoading(true);
		// 获取hash加密密码
		const result = await getLoginHash(username).catch((e) => {
			message.error("hash获取出错, try again");
			return null;
		});
		const hash = result?.data;

		if (hash) {
			const { code, data, message: msg } = await loginApi(username, AES.encrypt(password, hash).toString());
			if (code === 200) {
				setToken(data);
				useUserStore.getState().setUser({ user: username } as any);
				checkUser();
			} else {
				let m = "";
				switch (msg) {
					case "userNan":
						m = "用户名错误";
						break;
					case "passwd Error":
						m = "用户密码错误";
						break;
					case "user null":
						m = "未知用户";
						break;
					default:
						m = "登录遇到未知错误";
						break;
				}
				message.error(m);
				setLoginLoading(false);
			}
		} else {
			message.error("hash空");
			setLoginLoading(false);
		}
	};

	return loading ? (
		<div className="loading">
			<Spin description="loading" size="large" />
		</div>
	) : (
		<div className="login-page bg-glass-mesh">
			<Layout className="layout">
					<Layout.Header className="header">
						{/* <Image src="https://www.ladishb.com/logo.png" preview={false}></Image> */}
						<span className="text-brand-gradient" style={{ fontSize: 36, fontFamily: "cursive", fontWeight: 700 }}>百事服</span>
						<Dropdown
							menu={{
								items: [
									{ key: "cn", label: "中文", icon: <IconFont type="icon-zhongwen" />, onClick: () => setZh(true) },
									{ key: "en", label: "En", icon: <IconFont type="icon-yingwen" />, onClick: () => setZh(false) }
								]
							}}
							className="header-drop"
						>
							<a href="" onClick={(e) => e.preventDefault()}>
								lauguage
							</a>
						</Dropdown>
					</Layout.Header>
					<Layout.Content className="content">
						<Row className="content-row">
							<Col span={24} md={12}>
								<div className="content-row-col1">
									<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
										<div
											style={{
												width: 48, height: 48, borderRadius: 14,
												background: 'rgba(255, 255, 255, 0.2)',
												backdropFilter: 'blur(20px)',
												border: '1px solid rgba(255, 255, 255, 0.3)',
												display: 'flex', alignItems: 'center', justifyContent: 'center',
												color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700,
											}}
										>
											U
										</div>
										<div style={{ fontSize: 20, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
											UART Server
										</div>
									</div>
									<h3>管理 <em style={{ fontStyle: 'normal', background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>941 台</em><br />工业 IoT 设备</h3>
									<h4>实时采集 · 远程控制 · 告警通知 · 数据分析。一套平台搞定从 DTU 到云端的所有环节。</h4>
									<div
										style={{
											marginTop: 48, display: 'flex', gap: 40,
											paddingTop: 32, borderTop: '1px solid rgba(255, 255, 255, 0.2)',
										}}
									>
										<div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
											在线设备
											<strong style={{ display: 'block', fontSize: 32, fontWeight: 600, opacity: 1, letterSpacing: '-0.02em', marginTop: 6, fontFamily: 'var(--font-sans)' }}>291</strong>
										</div>
										<div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
											覆盖协议
											<strong style={{ display: 'block', fontSize: 32, fontWeight: 600, opacity: 1, letterSpacing: '-0.02em', marginTop: 6, fontFamily: 'var(--font-sans)' }}>47</strong>
										</div>
										<div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
											服务节点
											<strong style={{ display: 'block', fontSize: 32, fontWeight: 600, opacity: 1, letterSpacing: '-0.02em', marginTop: 6, fontFamily: 'var(--font-sans)' }}>12</strong>
										</div>
									</div>
								</div>
							</Col>
							<Col span={24} md={12} className="content-row-col2">
								<Card className="card-login">
									<Tabs defaultActiveKey={tabdefaultActiveKey} items={[
										{
											key: 'wx_qr',
											label: <span><WechatFilled />微信登录/注册</span>,
											children: <div id="wxlogin" className="hidden-sm-and-down"></div>,
										},
										{
											key: 'login',
											label: <span><UserOutlined />账号登录</span>,
											children: (
												<Form name="normal_login" className="login-form" initialValues={{ remember: true }} onFinish={onFinish}>
													<Form.Item name="username" rules={[{ required: true, message: "输入云平台账号或百事服账号!" }]}>
														<Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder="输入你的账号" />
													</Form.Item>
													<Form.Item name="password" rules={[{ required: true, message: "输入密码,密码不能为空!" }]}>
														<Input prefix={<LockOutlined className="site-form-item-icon" />} type="password" placeholder="输入密码" />
													</Form.Item>

													<Form.Item>
														<Button loading={loginLoading} type="primary" htmlType="submit" className="login-form-button">
															登录
														</Button>
														<Button
															loading={loginLoading}
															className="login-form-button-warning"
															onClick={() => onFinish({ username: "test", password: "123456" })}
														>
															我要试用?
														</Button>
														{hasDevCreds && (
															<Button
																loading={devLoginLoading}
																className="login-form-button-dev"
																onClick={onDevLogin}
																title="本机 .env.local 配置 DEV_ADMIN_USER / DEV_ADMIN_PASSWORD 才有效 (route.ts NODE_ENV guard)"
															>
																开发登录
															</Button>
														)}
													</Form.Item>
												</Form>
											),
										},
									]} />
								</Card>
							</Col>
						</Row>
					</Layout.Content>
					<Layout.Footer>
						© 2019 All Rights Reserved
						<a href="http://www.besiv.com/" target="_blank">
							百事服
						</a>
						鄂ICP备19029626号-1
					</Layout.Footer>
				</Layout>
			</div>
	);
};

export default Login;
