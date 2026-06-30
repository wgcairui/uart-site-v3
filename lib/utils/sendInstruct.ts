// 操作指令发送 helper (抽提自 util.ts sendOprateInstruct, 2026-06-30 scheduled-op 重构)
//
// 拆成 3 个函数:
// - buildInstructItem: 拉 OprateInstruct + 填 %i 占位符, 返回组装好的 item
// - sendInstructNow: 立即发送 (admin/user 走不同 endpoint, 行为与 sendOprateInstruct 等价)
// - sendInstructScheduled: 定时发送 (admin/user 走不同 endpoint, 入 BullMQ delayed job)
//
// 重要: sendInstructScheduled 的 content 字段是已组装的最终指令 (hex 字符串),
//   而 user 端原本是传 item 对象给 server 由 server 端 fillInstructTemplate 算 hex
//   这里在前端复刻 fillInstructTemplate (见 fillInstructTemplate), 行为与 server 端一致
import { Modal, message } from "antd";
import {
  SendProcotolInstructSet as userSendInstruct,
  getProtocolSetup as userGetProtocolSetup,
  getTerminalPidProtocol,
} from "@/lib/api/fetch";
import {
  createScheduledOp,
  SendProcotolInstructSet as adminSendInstruct,
  adminGetTerminal,
} from "@/lib/api/fetchRoot";
import { createUserScheduledOp } from "@/lib/api/fetch";
import { prompt } from "@/lib/utils/prompt";

/**
 * 复刻 server 端 ProtocolService.fillInstructTemplate 的逻辑
 * 把 %i (或 %i%i) 占位符按 bl 系数 + val 值替换为 hex 字符串
 *
 * 跟 src/midwayuartserver/src/module/protocol/service/protocol.service.ts:178 行为一致
 */
export function fillInstructTemplate(item: Uart.OprateInstruct): string {
  const value = item.value;
  if (!/(%i)/.test(value)) return value;

  const parsed = parseCoefficient(String(item.bl), Number(item.val));
  if (/%i%i/.test(value)) {
    // 2-byte big-endian → hex
    const num = Number(parsed);
    const hex =
      ((num >> 8) & 0xff).toString(16).padStart(2, "0") +
      (num & 0xff).toString(16).padStart(2, "0");
    return value.replace(/(%i%i)/, hex);
  }
  const hex = Number(parsed).toString(16);
  return value.replace(/(%i)/, hex);
}

/**
 * 复刻 server 端 ParseCoefficient (src/midwayuartserver/src/common/util/util.ts:185)
 * - bl 是纯数字 → 直接 bl * val
 * - bl 是表达式 → new Function 动态执行
 */
function parseCoefficient(fun: string, val: number): number | string {
  if (Number(fun)) return Number(fun) * val;
  const [arg, ...f] = fun.replace(/(^\(|\)$)/g, "").split(",");
  // eslint-disable-next-line no-new-func
  const Fun = new Function(arg ?? "", `return ${f.join(",")}`);
  return Fun(val) as number | string;
}

/**
 * 同步拉 OprateInstruct + 填 %i 占位符, 返回组装好的 item
 *
 * - admin 端: 走 adminGetTerminal + adminGetProtocolSetup (因为后端 route 不同)
 * - user 端: 走 user 端 fetch
 */
export async function buildInstructItem(
    api: "admin" | "user",
    mac: string,
    pid: number | string,
    tag: string,
    value?: number
): Promise<Uart.OprateInstruct> {
    let protocolName: string | undefined;
    if (api === "admin") {
        const { data: term } = await adminGetTerminal(mac);
        protocolName = term?.mountDevs?.find((d) => d.pid === Number(pid))?.protocol;
    } else {
        const { data: mountDev } = await getTerminalPidProtocol(mac, pid);
        protocolName = mountDev?.protocol;
    }
    if (!protocolName) {
        throw new Error("未找到设备协议");
    }
    if (api === "admin") {
        // admin 端没有 getProtocolSetup 端点, admin 端在 buildInstructItem 时
        // 走简化路径: 不预拉 OprateInstruct, 让调用方直接传 item
        // 实际 admin 端 TerminalOprate 走自己的内联流程, 不会调这个函数
        // 这里返回最简 item (admin 端 content 是裸指令名, 无需 %i 替换)
        return {
            name: tag,
            value: tag,
            bl: "1",
            readme: "",
            tag,
        } as Uart.OprateInstruct;
    }
    const { data: protData } = await userGetProtocolSetup<Uart.OprateInstruct>(
        protocolName,
        "OprateInstruct"
    );
    const sys = protData?.sys ?? [];
    const item = sys.find((el) => el.tag === tag || el.name === tag);
    if (!item) {
        throw new Error(`协议 ${protocolName} 未找到指令 ${tag}`);
    }
    if (value !== undefined) {
        item.val = value;
    }
    if (item.value.includes("%i") && (item.val === undefined || item.val === null)) {
        const val = await prompt({ title: "请输入修改的值" });
        if (!val) {
            throw new Error("用户取消输入");
        }
        item.val = Number(val);
    }
    return item;
}

/** 立即发送 (admin/user 走不同 endpoint)
 *  - user 端: SendProcotolInstructSet user 端, body 是 { protocolName, item } (server 端填模板)
 *  - admin 端: SendProcotolInstructSet admin 端, body 是 { pid, protocol, content } (content = item.value)
 */
export async function sendInstructNow(
  api: "admin" | "user",
  mac: string,
  pid: number,
  item: Uart.OprateInstruct,
  protocolName: string,
  mountDev?: string
): Promise<Uart.ApolloMongoResult> {
  if (api === "admin") {
    const { data } = await adminSendInstruct({
      DevMac: mac,
      pid,
      protocol: protocolName,
      content: item.value, // admin 端 content 是裸指令名
    } as any);
    return data as Uart.ApolloMongoResult;
  }
  const { data } = await userSendInstruct(
    { DevMac: mac, pid, protocol: protocolName, mountDev: mountDev ?? "" },
    item
  );
  return data as Uart.ApolloMongoResult;
}

/** 定时发送 (admin/user 走不同 endpoint, content 是已组装的最终 hex 字符串) */
export async function sendInstructScheduled(args: {
  api: "admin" | "user";
  mac: string;
  pid: number;
  item: Uart.OprateInstruct;
  protocolName: string;
  scheduledAt: number; // ms timestamp
  remark?: string;
}): Promise<{ id: string; scheduledAt: number; status: Uart.ScheduledOpStatus }> {
  const { api, mac, pid, item, protocolName, scheduledAt, remark } = args;
  // 复刻 server 端 fillInstructTemplate, 把 item 算成最终 hex 字符串
  const content = fillInstructTemplate(item);
  const req: Uart.CreateScheduledOpReq = {
    mac,
    pid,
    protocol: protocolName,
    content,
    scheduledAt: new Date(scheduledAt).toISOString(),
    ...(remark ? { remark } : {}),
  };
  if (api === "admin") {
    const { data } = await createScheduledOp(req);
    return data as { id: string; scheduledAt: number; status: Uart.ScheduledOpStatus };
  }
  const { data } = await createUserScheduledOp(mac, pid, req);
  return data as { id: string; scheduledAt: number; status: Uart.ScheduledOpStatus };
}

/** Modal.info 提示 ack 结果, 跟原 sendOprateInstruct 风格一致 */
export function showSendResult(data: Uart.ApolloMongoResult | undefined) {
  if (data) Modal.info({ content: data?.msg || "发送失败" });
}
