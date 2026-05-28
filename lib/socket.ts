import { io, Socket } from "socket.io-client"
import { DefaultEventsMap } from "@socket.io/component-emitter";


interface subscribeData {
    /**
     * 事件名称
     */
    events: string
    /**
     * 事件数据
     */
    data: any
}


class SocketIO {
    io: Socket<DefaultEventsMap, DefaultEventsMap>
    /**
     * 注册事件
     */
    eventMap: Map<string, (((data: subscribeData) => void) | undefined)[]>;
    /**
     * 事件
     */
    private events: Set<string>
    private user: string;

    constructor() {
        this.user = ''
        this.io = io("/web", { path: '/client', autoConnect: false })
        this.io
            .on("info", msg => {
                console.log(msg);

            })
            .on("alarm", data => {
                console.log({ data });

            })
            .on("message", msg => {
                console.log(msg);
            })
            .on("connect", () => {
                console.log("socket conect success");
                this.io.emit("register", { user: this.user })
                this.events.forEach(val => {
                    this.subscribe(val)
                })
            })
            .on("disconnect", () => {
                console.log("socket disconnect");
            })
            .on('registerSuccess', data => {
                console.log(data);

            })

        this.eventMap = new Map()
        this.events = new Set()
    }

    /**
     * 打开socket连接
     * @param user
     */
    connect(user: string) {
        this.disConnect()
        console.log('socket connecting');
        this.user = user
        this.io.open()
    }

    /**
     * 关闭socket连接
     */
    disConnect() {
        console.info("socket ready disConnect")
        this.io.emit("disConnect", { user: this.user })
        this.io.close()
    }

    /**
     * 发送订阅信息
     * @param event
     */
    subscribe(event: string) {
        this.events.add(event)
        this.io.emit('subscribe', { event })
    }

    /**
     * 发送取消订阅信息
     * @param event
     */
    unSubscribe(event: string) {
        this.events.delete(event)
        this.io.emit('unSubscribe', { event })
    }




}

/**
 * socket.io-client节点
 */
export const socketClient = new SocketIO()



/**
 * 订阅socket信息
 * @param events
 * @param fun
 * @returns 返回事件数组中新添加的位置
 */
export const subscribeEvent = (events: string, fun: (data: subscribeData) => void) => {
    /**
     * 如果事件中没有则新建
     */
    if (!socketClient.eventMap.has(events)) {
        socketClient.eventMap.set(events, [])
    }


    /**
     * 获取事件数组
     */
    const funs = socketClient.eventMap.get(events)!
    const n = funs.push(fun)


    socketClient.subscribe(events)

    /**
     * 获取socket事件对象
     */
    const listins = socketClient.io.listeners(events)
    /**
     * 如果没有事件对象则新建监听
     */
    if (!listins || listins.length === 0) {
        socketClient.io.on(events, data => {
            funs.forEach(el => {
                if (el) {
                    el({ events, data })
                }
            })
        })

    }
    return n
}

/**
 * 取消订阅事件函数
 * @param events
 * @param n
 */
export const unSubscribeEvent = (events: string, n: number) => {
    if (socketClient.eventMap.has(events)) {
        socketClient.eventMap.get(events)!.splice(n - 1, 1, undefined)
        socketClient.unSubscribe(events)
    }
}
