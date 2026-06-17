// 高德地图 (外部) API 封装
import { Get } from '@/lib/api/fetch'
import { universalResult } from '@/types'

const AmapKey: string = '0e99d0426f1afb11f2b95864ebd898d0'
const ApiAddress: string = 'https://restapi.amap.com/v3/'

type restype = 'ip' | 'geocode/geo' | 'geocode/regeo' | 'assistant/coordinate/convert'

interface AmapResonp {
  status: string;
  info: string;
  infocode: string;
}

interface AmapResonpGeocodeGeo extends AmapResonp {
  count: string;
  geocodes: {
    formatted_address: string;
    country: string;
    province: string;
    citycode: string;
    city: string;
    district: string;
    adcode: string;
    street: string;
    number: string;
    location: string;
    level: string;
  }[];
}

interface AmapResonpGeocodeRegeo extends AmapResonp {
  regeocode: { formatted_address: string };
}

interface AmapResonpAutonavi extends AmapResonp {
  locations: string;
}

/** 地址转 GPS */
export const Aamp_address2local = (address: string) => {
  return AmapGet<AmapResonpGeocodeGeo>('geocode/geo', { address })
}

/** GPS 转地址 */
export const Aamp_local2address = (location: string) => {
  return AmapGet<AmapResonpGeocodeRegeo>('geocode/regeo', { location })
}

/** GPS 转高德 GPS */
export const Aamp_gps2autoanvi = (coordsys: 'gps' | 'mapbar' | 'baidu', locations: string) => {
  return AmapGet<AmapResonpAutonavi>('assistant/coordinate/convert', { coordsys, locations })
}

async function AmapGet<T>(type: restype, params: Record<string, string>): Promise<T> {
  const result = await Get<universalResult<T>>(ApiAddress + type, { key: AmapKey, ...params })
  return result.data
}