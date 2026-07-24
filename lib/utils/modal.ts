/**
 * Modal wrapper — 统一 antd Modal 静态方法的按钮样式
 *
 * ## 解决的问题
 *
 * v2 品牌色（紫粉渐变 #8b5cf6 → #f472b6）跟 antd 默认蓝 #1677ff 不一致。
 * 站点目前 28+ 处 `Modal.confirm / success / info / error / warning` 调用点，
 * 直接用 antd 默认 API 会出现「紫粉页面 + 蓝色确认按钮」的违和。
 *
 * 全部改写为 `<Button variant="primary" className="btn-brand">` 工作量太大（要管 onOk 闭包、
 * footer 自定义、Modal.confirm 跟 Button 是不同 API），且 Modal 静态方法（`Modal.confirm`
 * 走 confirm dialog，不是 `<Modal>` 组件）无法直接套 `<Button>` wrapper。
 *
 * **最小侵入方案**：包一层，自动给 `okButtonProps.className` / `cancelButtonProps.className`
 * 注入 `btn-brand` / `btn-danger` / `btn-default` CSS class（这些 class 已在
 * `app/globals.css` 里定义）。调用方改 `import { confirm } from '@/lib/utils/modal'` 即可。
 *
 * ## 跟 antd 默认 Modal 的差异
 *
 * | 项 | antd 默认 | wrapper |
 * |---|---|---|
 * | 确认按钮颜色 | 蓝 (#1677ff) | 紫粉渐变 (`btn-brand`) |
 * | 危险确认按钮 | 蓝 | 红 (`btn-danger`，识别 `okButtonProps.danger === true`) |
 * | 取消按钮 | 蓝文字 | 中性边框 (`btn-default`) |
 * | 其他 props | 原样 | 原样透传 |
 * | API 签名 | `ModalFuncProps` | `ModalFuncProps`（同一份类型） |
 *
 * ## 用法
 *
 * ```tsx
 * // 1. 普通确认（自动用 btn-brand 紫粉渐变）
 * import { confirm } from '@/lib/utils/modal'
 *
 * confirm({
 *   title: '确认删除设备',
 *   content: '此操作不可撤销',
 *   onOk: () => deleteDevice(id),
 * })
 *
 * // 2. 危险确认（传 danger: true → btn-danger 红色）
 * confirm({
 *   title: '确认清空所有数据',
 *   content: '此操作不可撤销',
 *   okButtonProps: { danger: true },
 *   onOk: () => clearAll(),
 * })
 *
 * // 3. 调用方想覆盖默认 className → wrapper 不覆盖
 * confirm({
 *   title: '自定义按钮',
 *   okButtonProps: { className: 'my-custom-btn' },  // 完全替换，不会被注入 btn-brand
 *   onOk: () => {},
 * })
 *
 * // 4. 通知类（success / info / error / warning）— 只有 OK 按钮，无 cancel
 * import { success, error } from '@/lib/utils/modal'
 * success({ content: '已保存' })
 * error({ content: '保存失败' })
 * ```
 *
 * ## 限制
 *
 * - 只覆盖 `okButtonProps.className` 和 `cancelButtonProps.className`。
 *   其他 antd 原生 props（title / content / onOk / onCancel / icon 等）一律原样透传。
 * - 不替换 `<Modal>` 组件用法（`open` 模式）。只针对静态方法（`Modal.confirm` / `Modal.success` 等）。
 * - 不改变 `ModalFuncProps` 的类型（从 antd 直接 import）。
 *
 * 参考: docs/style-guide.md v2 §4.6（Button 规范）+ §7（反模式清单）
 */

import { Modal } from 'antd'
import type { ModalFuncProps } from 'antd/es/modal/interface'

type ModalFunc = (props: ModalFuncProps) => {
  destroy: () => void
  update: (configUpdate: ModalFuncProps | ((prev: ModalFuncProps) => ModalFuncProps)) => void
}

/**
 * 计算 okButtonProps：保留调用方传入的所有字段，className 默认 'btn-brand'（danger 时 'btn-danger'）。
 * 调用方已传 className 时 wrapper 不覆盖（最高优先级）。
 */
function buildOkButtonProps(props: ModalFuncProps): NonNullable<ModalFuncProps['okButtonProps']> {
  const okButtonProps = props.okButtonProps ?? {}
  const danger = okButtonProps.danger === true
  const className = okButtonProps.className ?? (danger ? 'btn-danger' : 'btn-brand')
  return { ...okButtonProps, className }
}

/**
 * 计算 cancelButtonProps：保留调用方传入的所有字段，className 默认 'btn-default'。
 * 调用方已传 className 时 wrapper 不覆盖。
 */
function buildCancelButtonProps(props: ModalFuncProps): NonNullable<ModalFuncProps['cancelButtonProps']> {
  return { className: 'btn-default', ...(props.cancelButtonProps ?? {}) }
}

/**
 * 确认弹窗（含 OK + Cancel 两个按钮）
 *
 * - OK 按钮：`btn-brand` 紫粉渐变（除非 `okButtonProps.danger === true` → `btn-danger`）
 * - Cancel 按钮：`btn-default` 中性边框
 */
export const confirm: ModalFunc = (props) => {
  return Modal.confirm({
    ...props,
    okButtonProps: buildOkButtonProps(props),
    cancelButtonProps: buildCancelButtonProps(props),
  })
}

/**
 * 成功提示（仅 OK 按钮，无 cancel）
 */
export const success: ModalFunc = (props) => {
  return Modal.success({
    ...props,
    okButtonProps: buildOkButtonProps(props),
  })
}

/**
 * 普通信息提示（仅 OK 按钮，无 cancel）
 */
export const info: ModalFunc = (props) => {
  return Modal.info({
    ...props,
    okButtonProps: buildOkButtonProps(props),
  })
}

/**
 * 错误提示（仅 OK 按钮，无 cancel）
 */
export const error: ModalFunc = (props) => {
  return Modal.error({
    ...props,
    okButtonProps: buildOkButtonProps(props),
  })
}

/**
 * 警告提示（仅 OK 按钮，无 cancel）
 */
export const warning: ModalFunc = (props) => {
  return Modal.warning({
    ...props,
    okButtonProps: buildOkButtonProps(props),
  })
}

/**
 * 便捷 re-export：如果某些场景想用 antd 原生 Modal（不推荐，已被上面 5 个替代），
 * 可以 `import { Modal } from '@/lib/utils/modal'`。
 */
export { Modal }
