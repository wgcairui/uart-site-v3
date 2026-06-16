/**
 * Uart 全局类型定义（原 `types-uart` npm 包，v2.2.0）
 *
 * 直接内联到项目里，便于：
 * 1. 修复上游类型遗漏的字段（如 `logTerminals.timeStamp`）
 * 2. 不再依赖外部包，避免 publish 频率影响项目
 *
 * 修改：logTerminals interface 增加 timeStamp?: number（业务数据实际有）
 */
declare namespace Uart {
    type communicationType = 232 | 485;
    type protocolType = "ups" | "air" | "em" | "th" | 'io';
    type characterType = "utf8" | "hex" | "float" | "short" | "int" | "HX" | 'bit2';
    type secretType = "mail" | "aliSms" | "hf" | "wxopen" | "wxmp" | "wxwp" | "wxmpValidaton" | 'dyIot';
    interface id {
        _id?: string;
    }
    interface Secret_app extends id {
        type: secretType;
        appid: string;
        secret: string;
    }
    interface Token {
        type: string;
        token: string;
        expires: number;
        creatTime: number;
    }
    interface ApolloMongoResult {
        msg: string;
        ok: number;
        n: number;
        nModified: number;
        upserted: any;
        arg?: any;
    }
    interface PageQuery {
        DevMac: string;
        pid: string;
        mountDev: string;
        protocol: string;
    }
    interface protocolInstructFormrize {
        name: string;
        enName?: string;
        regx: string | null;
        bl: string;
        unit: string | null;
        isState: boolean;
    }
    interface protocolInstruct {
        name: string;
        resultType: characterType;
        shift: boolean;
        shiftNum: number;
        pop: boolean;
        popNum: number;
        isSplit: boolean;
        resize: string;
        formResize: protocolInstructFormrize[];
        isUse: boolean;
        noStandard: boolean;
        scriptStart: string;
        scriptEnd: string;
        remark?: string;
    }
    interface protocol extends id {
        Type: communicationType;
        Protocol: string;
        ProtocolType: protocolType;
        instruct: protocolInstruct[];
        remark?: string;
    }
    interface DevsType extends id {
        Type: string;
        DevModel: string;
        Protocols: {
            Type: communicationType;
            Protocol: string;
        }[];
        remark?: string;
    }
    interface RegisterTerminal extends id {
        DevMac: string;
        mountNode: string;
        bindDev?: string;
        remark?: string;
    }
    interface TerminalMountDevs {
        Type: string;
        online?: boolean;
        mountDev: string;
        protocol: string;
        pid: number;
        bindDev?: string;
    }
    interface iccidInfo {
        statu: boolean;
        IsAutoRecharge: boolean;
        expireDate: string;
        resName: string;
        flowUsed: number;
        restOfFlow: number;
        flowResource: number;
        version: string;
    }
    interface Terminal extends RegisterTerminal {
        tag?: string[];
        DevMac: string;
        online?: boolean;
        disable?: boolean;
        mountNode: string;
        name: string;
        ip?: string;
        port?: number;
        AT?: boolean;
        jw?: string;
        uart?: string;
        uptime?: string;
        PID?: string;
        ver?: string;
        Gver?: string;
        iotStat?: string;
        ICCID?: string;
        mountDevs: TerminalMountDevs[];
        iccidInfo?: iccidInfo;
        share?: boolean;
        signal?: number;
    }
    interface TerminalMountDevsEX extends TerminalMountDevs {
        TerminalMac: string;
        Interval: number;
    }
    interface registerDev extends TerminalMountDevs {
        id: string;
    }
    interface NodeClient extends id {
        Name: string;
        IP: string;
        Port: number;
        MaxConnections: number;
        count?: number;
        remark?: string;
        /** 是否已配置 token 鉴权（派生自 nodeTokenHash 是否存在）。true=走 token, false=存量 IP 回退 */
        hasToken?: boolean;
        /** 最近一次成功鉴权记录的客户端 IP（审计/告警用） */
        lastSeenIp?: string;
        /** 最近一次成功鉴权时间 */
        lastSeenAt?: Date | string;
    }
    interface BindDevice extends id {
        user: string;
        ECs: string[];
        ECsShare: string[];
        UTs: string[];
        UTsShare: string[];
        AGG: string[];
        AGGShare: string[];
        bind?: {
            UTs: Terminal[];
            [x: string]: any;
        };
    }
    interface SocketRegisterInfo {
        hostname: string;
        totalmem: string;
        freemem: string;
        loadavg: number[];
        type: string;
        uptime: string;
        userInfo: {
            uid: number;
            gid: number;
            username: string;
            homedir: string;
            shell: string;
        };
    }
    interface queryObject {
        mac: string;
        type: number;
        mountDev: string;
        protocol: string;
        pid: number;
        timeStamp: number;
        content: string | string[];
        Interval: number;
        useTime: number;
    }
    interface queryResultArgument {
        name: string;
        value: any;
        parseValue: string;
        unit: string | null;
        issimulate?: boolean;
        alarm?: boolean;
        alias?: string;
    }
    interface queryResult extends queryObject {
        contents: IntructQueryResult[];
        result?: queryResultArgument[];
        time?: string;
        useBytes?: number;
    }
    interface IntructQueryResult {
        content: string;
        buffer: {
            data: number[];
            type: string;
        };
    }
    interface timelog {
        content: string;
        num: number;
    }
    interface uartData extends NodeClient {
        data: queryResult[];
    }
    interface socketNetInfo {
        ip: string;
        port: number;
        mac: string;
        jw: string;
        uart: string;
        AT: boolean;
        ICCID: string;
        connecting: boolean;
        lock: boolean;
        PID: string;
        ver: string;
        Gver: string;
        iotStat: string;
    }
    interface WebSocketInfo {
        NodeName: string;
        Connections: number | Error;
        SocketMaps: socketNetInfo[];
    }
    interface nodeInfo {
        hostname: string;
        totalmem: string;
        freemem: string;
        loadavg: number[];
        usemen?: number;
        usecpu?: number;
        type: string;
        uptime: string;
        version: string;
    }
    type registerType = "wx" | "web" | "app" | "pesiv";
    interface UserInfo extends id {
        avanter?: string;
        userId: string;
        name?: string;
        user: string;
        userGroup?: string;
        passwd?: string;
        mail?: string;
        company?: string;
        tel?: number;
        creatTime?: Date;
        modifyTime?: Date;
        address?: string;
        status?: boolean;
        rgtype: registerType;
        wpId?: string;
        wxId?: string;
        openId?: string;
        proxy?: string;
        remark?: string;
    }
    interface DevConstant_Air {
        Switch: string;
        WorkMode: string;
        HeatChannelTemperature: string;
        HeatChannelHumidity: string;
        ColdChannelTemperature: string;
        ColdChannelHumidity: string;
        RefrigerationTemperature: string;
        RefrigerationHumidity: string;
        Speed: string;
    }
    interface DevConstant_EM {
        battery: string;
        voltage: string[];
        current: string[];
        factor: string[];
    }
    interface DevConstant_Ups {
        Switch: string;
        WorkMode: string;
        UpsStat: string[];
        BettyStat: string[];
        InputStat: string[];
        OutStat: string[];
    }
    interface DevConstant_TH {
        Temperature: string;
        Humidity: string;
    }
    interface DevConstant_IO {
        di: string[];
        do: string[];
    }
    interface DevConstant extends DevConstant_Air, DevConstant_EM, DevConstant_TH, DevConstant_Ups, DevConstant_IO, id {
        remark?: string;
    }
    interface Threshold {
        name: string;
        min: number;
        max: number;
    }
    interface ConstantAlarmStat extends queryResultArgument {
        alarmStat: string[];
    }
    interface OprateInstruct {
        name: string;
        value: string;
        bl: string;
        val?: number;
        readme: string;
        tag: string;
    }
    interface ProtocolConstantThreshold {
        Protocol: string;
        ProtocolType: string;
        Constant: DevConstant;
        Threshold: Threshold[];
        AlarmStat: ConstantAlarmStat[];
        ShowTag: string[];
        OprateInstruct: OprateInstruct[];
    }
    interface alias {
        name: string;
        alias: string;
    }
    interface DevArgumentAlias {
        mac: string;
        pid: number;
        protocol: string;
        alias: alias[];
    }
    interface userSetup {
        user: string;
        tels: string[];
        mails: string[];
        wxs: string[];
        ProtocolSetup: ProtocolConstantThreshold[];
        ProtocolSetupMap: Map<string, ProtocolConstantThreshold>;
        ShowTagMap: Map<string, Set<string>>;
        ThresholdMap: Map<string, Map<string, Threshold>>;
        AlarmStateMap: Map<string, Map<string, ConstantAlarmStat>>;
    }
    interface queryResultSave extends Record<string, any> {
        mac: string;
        pid: number;
        timeStamp: number;
        result: queryResultArgument[];
        Interval: number;
        useTime: number;
        time: string;
    }
    type ConstantThresholdType = "Threshold" | "Constant" | "ShowTag" | "OprateInstruct" | "AlarmStat";
    interface instructQueryArg extends queryResultArgument {
        DevMac: string;
        pid: number;
        mountDev: string;
        protocol: string;
    }
    interface instructQuery {
        protocol: string;
        DevMac: string;
        pid: number;
        type: number;
        events: string;
        content: string;
        result?: ArrayBuffer;
        Interval?: number;
    }
    interface uartAlarmObject {
        parentId?: string;
        mac: string;
        devName: string;
        pid: number;
        protocol: string;
        tag: string;
        timeStamp: number;
        msg: string;
        isOk?: boolean;
    }
    type UartAlarmType = "透传设备下线提醒" | "透传设备上线提醒" | '透传设备告警';
    interface smsUartAlarm {
        parentId?: string;
        user: string;
        tel: string;
        name: string;
        devname: string;
        air?: string;
        event?: string;
        type: UartAlarmType;
    }
    interface logInnerMessages extends id {
        timeStamp: number;
        user?: string;
        nikeName?: string;
        mac?: string;
        page?: number;
        data?: Record<string, any>;
        message: string;
    }
    interface logSmsSend extends id {
        tels: string[];
        sendParams: {
            RegionId: string;
            PhoneNumbers: string;
            SignName: string;
            TemplateCode: string;
            TemplateParam: String;
        };
        Success?: {
            Message: string;
            RequestId: string;
            BizId: string;
            Code: string;
        };
        Error?: any;
    }
    interface mailResponse {
        accepted: string[];
        rejected: string[];
        envelopeTime: number;
        messageTime: number;
        messageSize: number;
        response: string;
        envelope: {
            from: string;
            to: string[];
        };
        messageId: string;
    }
    interface logMailSend extends id {
        mails: string[];
        sendParams: {
            from: string;
            to: string;
            subject: string;
            html: string;
        };
        Success?: mailResponse;
        Error?: any;
    }
    interface logUserRequst extends id {
        user: string;
        userGroup: string;
        type: string;
        argument?: any;
    }
    type logLogins = "用户登陆" | '用户登出' | '用户注册' | "用户重置密码" | "用户修改信息";
    interface logUserLogins extends id {
        user: string;
        type: logLogins;
        address: string;
        msg: string;
    }
    type logNodesType = "连接" | "断开" | "上线" | "重新上线" | "非法连接请求" | "TcpServer启动失败" | "告警" | "重新连接" | "节点断开" | "dtu主动断开" | "dtu断开";
    interface logNodes extends id {
        ID: string;
        IP: string;
        Name: string;
        type: logNodesType;
    }
    type logTerminalsType = "连接" | "断开" | "查询超时" | "查询恢复" | "操作设备" | "操作设备结果" | 'DTU操作' | "重新连接" | "节点断开" | "dtu主动断开" | "dtu断开";
    interface logTerminals extends id {
        NodeIP: string;
        NodeName: string;
        TerminalMac: string;
        type: logTerminalsType;
        msg?: string;
        query?: any;
        result?: any;
        createdAt?: Date;
        timeStamp?: number;  // 后端实际返回的毫秒时间戳，上游未声明
    }

    // ─── terminal timeline (server feat/log-terminal-timeline @ 0cc02dd) ───
    // 字段名权威源: midwayuartserver/src/common/types/log-event.schema.ts (commit 5ab6f10)
    // 前端不引入 zod runtime，TS discriminated union 镜像 server zod schema

    type TerminalLogKind =
        | 'TERMINAL_CONNECT'
        | 'TERMINAL_OFFLINE'
        | 'DTU_OPERATION'
        | 'DEVICE_OPERATION'
        | 'QUERY_TIMEOUT'
        | 'PARTIAL_INSTRUCT_TIMEOUT'
        | 'ALARM_TRIGGER'
        | 'ALARM_RECOVER'
        | 'DATA_EXCEPTION'
        | 'PARSE_NULL'
        | 'PARSE_ALARM';

    type TerminalSidecarKind =
        | 'NODE_CONNECT'
        | 'NODE_DISCONNECT'
        | 'NODE_INVALID'
        | 'NODE_TCP_FAIL'
        | 'DTU_BUSY_TRUE'
        | 'DTU_BUSY_FALSE';

    type TerminalEventKind = TerminalLogKind | TerminalSidecarKind;

    /** terminalEvents 通用基础字段（payload schema 用） */
    interface TerminalEventBasePayload {
        mac: string;
        timeStamp: number;
        nodeName?: string;
        nodeIp?: string;
    }

    /** 各 kind 对应 payload schema — 镜像 server zod discriminatedUnion */
    type TerminalEventPayloadUnion =
        | (TerminalEventBasePayload & { kind: 'TERMINAL_CONNECT'; protocol?: string; pid?: number; mountDev?: string })
        | (TerminalEventBasePayload & { kind: 'TERMINAL_OFFLINE'; lastSeen: number; reason: string })
        | (TerminalEventBasePayload & { kind: 'DTU_OPERATION'; op: string; target?: string; args?: unknown })
        | (TerminalEventBasePayload & { kind: 'DEVICE_OPERATION'; instruct: string; mountDev?: string; protocol?: string; pid?: number })
        | (TerminalEventBasePayload & { kind: 'QUERY_TIMEOUT' | 'PARTIAL_INSTRUCT_TIMEOUT'; instruct?: string; timeoutMs: number; partial: boolean })
        | (TerminalEventBasePayload & { kind: 'ALARM_TRIGGER' | 'ALARM_RECOVER'; rule: string; value: number | string; threshold?: number | string; protocol?: string; devName?: string; alarmType?: string })
        | (TerminalEventBasePayload & { kind: 'DATA_EXCEPTION'; reason: string; rawLen?: number })
        | (TerminalEventBasePayload & { kind: 'PARSE_NULL'; instruct?: string; rawLen?: number })
        | (TerminalEventBasePayload & { kind: 'PARSE_ALARM'; instruct: string; protocol?: string; pid?: number; devName?: string });

    /** terminalSidecar payload — node 级事件，mac 允许空字符串 */
    type TerminalSidecarPayloadUnion =
        | { kind: 'NODE_CONNECT'; mac: string; timeStamp: number; nodeId: string }
        | { kind: 'NODE_DISCONNECT'; mac: string; timeStamp: number; nodeId: string; reason?: string }
        | { kind: 'NODE_INVALID'; mac: string; timeStamp: number; sourceIp?: string; reason: string }
        | { kind: 'NODE_TCP_FAIL'; mac: string; timeStamp: number; error: string }
        | (TerminalEventBasePayload & { kind: 'DTU_BUSY_TRUE' | 'DTU_BUSY_FALSE'; consecutiveN: number });

    type TerminalTimelinePayload = TerminalEventPayloadUnion | TerminalSidecarPayloadUnion;

    interface TerminalTimelineItem {
        _id: string;
        mac: string;
        timeStamp: number;
        kind: TerminalEventKind;
        payload: TerminalTimelinePayload;
        nodeName?: string;
        nodeIp?: string;
        source: 'event' | 'sidecar';
        /** server zod safeParse 失败时填充，前端做兜底展示 */
        invalidPayload?: { kind: string; issues: unknown[] };
        legacyCollection?: 'log.terminals' | 'log.uartterminaldatatransfinites' | 'log.nodes' | 'log.dtubusy';
        legacyType?: string;
    }

    /** Timeline 查询请求 — server DTO 镜像 */
    interface TerminalTimelineReq {
        mac: string;
        startTs: number;
        endTs: number;          // 上限 31 天（server pagination.helper 强制）
        kinds?: TerminalEventKind[];
        includeNodeEvents?: boolean;  // 默认 true
        page: number;
        pageSize: number;       // 默认 50
    }
    interface logTerminaluseBytes extends id {
        mac: string;
        date: string;
        useBytes: number;
    }
    interface logDtuBusy extends id {
        mac: string;
        stat: boolean;
        n: number;
        timeStamp: number;
    }
    interface AggregationDev extends TerminalMountDevs {
        result: queryResultArgument[] | undefined;
        DevMac: string;
        name: string;
        online: boolean;
    }
    interface AggregationDevParse {
        pid: number;
        DevMac: string;
        name: string;
        Type: string;
        mountDev: string;
        protocol: string;
        parse: {
            [x: string]: queryResultArgument;
        };
    }
    interface Aggregation {
        user: string;
        id: string;
        name: string;
        aggregations: AggregationDev[];
        devs: AggregationDevParse[];
        remark?: string;
    }
    interface DTUoprate {
        DevMac: string;
        events: string;
        content: string;
        result?: string;
    }
    interface AggregationLayoutNode {
        x: number;
        y: number;
        id: string;
        name: string;
        bind: {
            mac: string;
            pid: number;
            name: string;
        };
        color: string;
        result?: queryResultArgument;
    }
    interface userLayout {
        user: string;
        type: string;
        id: string;
        bg: string;
        Layout: AggregationLayoutNode[];
    }
    namespace WX {
        interface wxRequest {
            errcode?: number;
            errmsg?: string;
            [x: string]: any;
        }
        interface wxValidation {
            signature: string;
            timestamp: string;
            nonce: string;
            echostr: string;
        }
        type pushEvent = 'subscribe' | 'unsubscribe' | 'SCAN' | 'LOCATION' | 'CLICK' | 'VIEW';
        interface WxEvent {
            ToUserName: string;
            FromUserName: string;
            CreateTime: string;
            MsgType: string;
            Event?: pushEvent & string;
            EventKey?: string;
            Content?: string;
            MenuID?: string;
            ScanCodeInfo?: any;
            ScanType?: string;
            ScanResult?: string;
            SendPicsInfo?: any;
            Count?: number;
            PicList?: any[];
            PicMd5Sum?: string;
            Ticket?: string;
        }
        interface ticketPublic extends wxRequest {
            ticket: string;
            expire_seconds: number;
            url: string;
        }
        interface materials_list extends wxRequest {
            "total_count": number;
            "item_count": number;
            "item": {
                "media_id": string;
                "content"?: {
                    "news_item": {
                        "title": string;
                        "thumb_media_id": string;
                        "show_cover_pic": string;
                        "author": string;
                        "digest": string;
                        "content": string;
                        "url": string;
                        "content_source_url": string;
                    }[];
                };
                "name"?: string;
                "url"?: string;
                "update_time": string;
            }[];
        }
        interface webLogin extends wxRequest {
            "access_token": string;
            "expires_in": number;
            "refresh_token": string;
            "openid": string;
            "scope": string;
            "unionid"?: string;
        }
        interface webUserInfo extends wxRequest {
            "openid": string;
            "nickname": string;
            "sex": 0 | 1 | 2;
            "province": string;
            "city": string;
            "country": string;
            "headimgurl": string;
            "privilege": string[];
            "unionid": string;
        }
        interface menu_sub {
            type: "click" | 'view' | 'miniprogram' | 'scancode_push' | 'scancode_waitmsg' | 'pic_sysphoto' | 'pic_photo_or_album' | 'pic_weixin' | 'location_select' | 'media_id' | 'view_limited';
            name: string;
            key?: string;
            url?: string;
            appid?: string;
            pagepath?: string;
            media_id?: string;
        }
        interface menu {
            button: {
                name: string;
                sub_button: menu_sub[];
            }[];
        }
        interface userInfoPublic extends webUserInfo {
            "subscribe": 0 | 1;
            "openid": string;
            "nickname": string;
            "sex": 0 | 1 | 2;
            "language": string;
            "city": string;
            "province": string;
            "country": string;
            "headimgurl": string;
            "subscribe_time": number;
            "unionid": string;
            "remark": string;
            "groupid": number;
            "tagid_list": number[];
            "subscribe_scene": "ADD_SCENE_SEARCH" | "ADD_SCENE_ACCOUNT_MIGRATION" | "ADD_SCENE_PROFILE_CARD" | "ADD_SCENE_QR_CODE" | "ADD_SCENE_PROFILE_LINK" | "ADD_SCENE_PROFILE_ITEM" | "ADD_SCENE_PAID" | "ADD_SCENE_WECHAT_ADVERTISEMENT" | "ADD_SCENE_OTHERS";
            "qr_scene": number;
            "qr_scene_str": string;
        }
        interface userlistPublic extends wxRequest {
            "total": number;
            "count": number;
            "data": {
                "openid": string[];
            };
            "next_openid": string;
        }
        interface wxRequestCode2Session extends wxRequest {
            openid: string;
            session_key: string;
            unionid: string;
        }
        interface wxRequestAccess_token extends wxRequest {
            access_token: string;
            expires_in: number;
        }
        interface wxsubscribeMessage {
            touser: string;
            template_id: string;
            url?: string;
            page?: string;
            miniprogram_state?: 'developer' | 'trial' | 'formal';
            lang?: string;
            miniprogram?: {
                appid: string;
                pagepath?: string;
            };
            data: {
                [x: string]: {
                    value: string;
                    color?: string;
                };
            };
        }
        interface wxRequest_industry extends wxRequest {
            primary_industry: {
                "first_class": string;
                "second_class": string;
            };
            secondary_industry: {
                "first_class": string;
                "second_class": string;
            };
        }
        interface urlScheme {
            access_token: string;
            "jump_wxa": {
                "path"?: string;
                "query"?: string;
            };
            "is_expire"?: boolean;
            "expire_time"?: number;
        }
        interface urlSchemeRequest extends wxRequest {
            openlink: string;
        }
    }
}
