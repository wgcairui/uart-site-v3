'use client'
import { createFromIconfontCN } from '@ant-design/icons';
import React, { CSSProperties, useMemo } from 'react';
import "./IconFont.css"


const alicdn = `//at.alicdn.com/t/font_1579455_gcv4v9jrnah.js`

/**
 * aliIcon
 */
export const IconFont = createFromIconfontCN({
  scriptUrl: alicdn
});


export const IconFontSpin: React.FC<CSSProperties & { type: string }> = (opt) => {
  const IFS = useMemo(() => {
    return createFromIconfontCN({
      scriptUrl: alicdn,
      extraCommonProps: {
        className: 'anmi',
        style: {
          fontSize: opt.fontSize || 48,
          animationDuration: opt.animationDuration || `0s`,
          color: opt.color
        }
      }
    });
  }, [opt])

  return (
    <IFS type={opt.type}></IFS>
  )
}

/**
 * 设备类型
 */
export const devTypeIcon: { [x in string]: React.ReactElement } = {
  '空调': <IconFont type="icon-kongdiao" color="#1296db" />,
  'IO': <IconFont type="icon-io" color="#13227a" />,
  '电量仪': <IconFont type="icon-dianliangyi" color="#d4237a" />,
  'UPS': <IconFont type="icon-upsdianyuan" color="#1296db" />,
  'TH': <IconFont type="icon-wenshidu" />
}
