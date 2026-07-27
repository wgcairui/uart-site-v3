'use client'
import React, { useEffect, useState } from "react";
import "./absButton.css"

/**
 * 主题变体 (2026-07-25)
 * - `default`     → 现有深灰浮动按钮 (admin 端 + 兼容)
 * - `control-room`→ user 端专用暗色, 走 --cr-* token, 黄色 FAB + glow
 */
export type AbsButtonTheme = 'default' | 'control-room'

/**
 *
 * @param param0
 * @returns
 *
 * theme="control-room" 走 --cr-* token (user 端 2026-07-25)
 * - FAB 圆形按钮: 深灰 → --cr-accent 黄色
 * - hover: 缩放 + 加强 glow
 * - 整站 idle 状态下 3s 慢 pulse 提示存在感
 */
export const AbsButton: React.FC<{
    onChange?: (stat: boolean) => void
    children?: React.ReactNode
    theme?: AbsButtonTheme
}> = ({ onChange, children, theme = 'default' }) => {

    const [showlist, setShowList] = useState(false)

    useEffect(() => {
        onChange && onChange(showlist)
    }, [showlist])

    const isCR = theme === 'control-room'

    // control-room 主题下走 .abs-btn-cr class, 不再用 .btn1
    if (isCR) {
        return (
            <>
                <button
                    type="button"
                    className="abs-btn-cr"
                    onClick={() => setShowList(!showlist)}
                    aria-label="我的设备"
                >
                    <span className={`abs-btn-icon ${showlist ? 'open' : ''}`}>
                        <svg viewBox="0 0 926.23699 573.74994" version="1.1" x="0px" y="0px" width="15" height="15" fill="currentColor">
                            <g transform="translate(904.92214,-879.1482)">
                                <path d="
          m -673.67664,1221.6502 -231.2455,-231.24803 55.6165,
          -55.627 c 30.5891,-30.59485 56.1806,-55.627 56.8701,-55.627 0.6894,
          0 79.8637,78.60862 175.9427,174.68583 l 174.6892,174.6858 174.6892,
          -174.6858 c 96.079,-96.07721 175.253196,-174.68583 175.942696,
          -174.68583 0.6895,0 26.281,25.03215 56.8701,
          55.627 l 55.6165,55.627 -231.245496,231.24803 c -127.185,127.1864
          -231.5279,231.248 -231.873,231.248 -0.3451,0 -104.688,
          -104.0616 -231.873,-231.248 z
        " />
                            </g>
                        </svg>
                    </span>
                </button>
                <div
                    onClick={() => setShowList(false)}
                    className={`abs-panel-cr ${showlist ? 'show' : ''}`}
                >
                    <div
                        style={{ transform: `translate(0px, ${showlist ? 0 : 40}px)`, transition: "transform 0.3s ease 0s" }}
                    >
                        {children}
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="btn1" onClick={() => setShowList(!showlist)}>
                <div className="btn2">
                    <div className="btn3">
                        <div className="btn4">
                            <svg className={showlist ? 'css-cf8c4v' : "css-sg9l1i"} viewBox="0 0 926.23699 573.74994" version="1.1" x="0px" y="0px" width="15" height="15" >
                                <g transform="translate(904.92214,-879.1482)">
                                    <path d="
          m -673.67664,1221.6502 -231.2455,-231.24803 55.6165,
          -55.627 c 30.5891,-30.59485 56.1806,-55.627 56.8701,-55.627 0.6894,
          0 79.8637,78.60862 175.9427,174.68583 l 174.6892,174.6858 174.6892,
          -174.6858 c 96.079,-96.07721 175.253196,-174.68583 175.942696,
          -174.68583 0.6895,0 26.281,25.03215 56.8701,
          55.627 l 55.6165,55.627 -231.245496,231.24803 c -127.185,127.1864
          -231.5279,231.248 -231.873,231.248 -0.3451,0 -104.688,
          -104.0616 -231.873,-231.248 z
        " fill="currentColor">
                                    </path>
                                </g>
                            </svg>
                            <svg className={showlist ? 'css-12wnq5i' : "css-o1zbu3"} viewBox="0 0 926.23699 573.74994" version="1.1" x="0px" y="0px" width="15" height="15">
                                <g transform="translate(904.92214,-879.1482)">
                                    <path d="
          m -673.67664,1221.6502 -231.2455,-231.24803 55.6165,
          -55.627 c 30.5891,-30.59485 56.1806,-55.627 56.8701,-55.627 0.6894,
          0 79.8637,78.60862 175.9427,174.68583 l 174.6892,174.6858 174.6892,
          -174.6858 c 96.079,-96.07721 175.253196,-174.68583 175.942696,
          -174.68583 0.6895,0 26.281,25.03215 56.8701,
          55.627 l 55.6165,55.627 -231.245496,231.24803 c -127.185,127.1864
          -231.5279,231.248 -231.873,231.248 -0.3451,0 -104.688,
          -104.0616 -231.873,-231.248 z
        " fill="currentColor">
                                    </path>
                                </g>
                            </svg>

                        </div>
                    </div>
                </div>
            </div>
            <div
                onClick={() => setShowList(false)}
                className="css-1sdm35g"
                style={{ opacity: showlist ? 1 : 0, transition: "opacity 0.5s ease 0s", pointerEvents: showlist ? "auto" : "none" }} >
                <div
                    className="css-1d35tl3"
                    style={{ transform: `translate(0px, ${showlist ? 0 : 40}px)`, transition: "transform 0.5s ease 0s" }}>
                    {
                        children
                    }
                </div>
            </div>
        </>
    )
}
