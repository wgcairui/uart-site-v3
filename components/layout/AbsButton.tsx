'use client'
import React, { useEffect, useState } from "react";
import "./absButton.css"

/**
 *
 * @param param0
 * @returns
 */
export const AbsButton: React.FC<{ onChange?: (stat: boolean) => void; children?: React.ReactNode }> = ({ onChange, children }) => {

    const [showlist, setShowList] = useState(false)

    useEffect(() => {
        onChange && onChange(showlist)
    }, [showlist])

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
