'use client'

import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Modal, Input, Form } from 'antd';
import type { Rule } from 'antd/es/form';
import type { ModalProps } from 'antd/es/modal';

interface Props {
    rules?: Rule[];
    placeholder?: string;
    ref?: any;
    value?: string;
    onPressEnter?: () => void;
}

const PromptForm = forwardRef(({ rules, placeholder, onPressEnter, value }: Props, ref: any) => {
    const [formInstance] = Form.useForm();

    useEffect(() => {
        formInstance.setFieldsValue({ input: value });
    }, []);

    useImperativeHandle(ref, () => ({
        validate: async () => {
            const res = await formInstance.validateFields();
            return res.input;
        },
    }));

    return (
        <Form form={formInstance}>
            <Form.Item name="input" {...(rules !== undefined ? { rules } : {})}>
                <Input {...(placeholder !== undefined ? { placeholder } : {})} {...(onPressEnter !== undefined ? { onPressEnter } : {})} />
            </Form.Item>
        </Form>
    );
});

PromptForm.displayName = 'PromptForm';

interface PromptConfig {
    title: string;
    value?: string;
    rules?: Rule[];
    placeholder?: string;
    modalProps?: Partial<ModalProps>;
    onOk?: (value?: string) => any;
}

interface PromptProps extends Props {
    modalProps?: Partial<ModalProps>;
    open: boolean;
    submit: (value?: string) => void;
    close: (value?: string) => void;
    title: string;
    afterClose?: () => void;
}

function Prompt({ rules, placeholder, modalProps = {}, open, submit, close, title, value, afterClose }: PromptProps) {
    const formRef = useRef<any>(null);
    const handleOk = async () => {
        try {
            const value = await formRef.current?.validate();
            submit(value);
        } catch (e) {
            // noop
        }
    };
    return (
        <Modal
            {...modalProps}
            open={open}
            onOk={handleOk}
            onCancel={() => close()}
            title={title}
            getContainer={false}
            {...(afterClose !== undefined ? { afterClose } : {})}
        >
            <PromptForm
                ref={formRef}
                {...(rules !== undefined ? { rules } : {})}
                {...(value !== undefined ? { value } : {})}
                {...(placeholder !== undefined ? { placeholder } : {})}
                onPressEnter={handleOk}
            />
        </Modal>
    );
}

export function prompt(config: PromptConfig): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
        const div = document.createElement('div');
        document.body.appendChild(div);
        const root = createRoot(div);
        const { onOk, ...others } = config;

        let currentConfig: PromptProps = {
            ...others,
            submit,
            close,
            open: true,
        };

        const destroy = (value?: string) => {
            // React 19 may call afterClose synchronously, defer unmount to avoid race
            queueMicrotask(() => {
                root.unmount();
                if (div.parentNode) {
                    div.parentNode.removeChild(div);
                }
            });
            if (value !== undefined) {
                resolve(value);
            } else {
                reject(value);
            }
        };

        function close(value?: string) {
            currentConfig = {
                ...currentConfig,
                open: false,
                afterClose: () => destroy(value),
            };
            render(currentConfig);
        }

        async function submit(value?: string) {
            if (onOk) {
                const isClose = await onOk(value);
                if (isClose || isClose === undefined) {
                    close(value);
                }
            } else {
                close(value);
            }
        }

        function render(props: PromptProps) {
            root.render(<Prompt {...props} />);
        }

        render(currentConfig);
    });
}
