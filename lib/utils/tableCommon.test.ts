import { describe, it, expect } from 'vitest'
import {
  generateTableKey,
  extractServerTableQuery,
  makeServerFilterProp,
  tableColumnsFilter,
} from './tableCommon'

describe('tableCommon', () => {
  describe('generateTableKey', () => {
    it('appends index to key field', () => {
      const data = [{ id: 'a' }, { id: 'b' }]
      const result = generateTableKey(data, 'id')
      expect(result[0]?.key).toBe('a0')
      expect(result[1]?.key).toBe('b1')
    })

    it('preserves other fields', () => {
      const data = [{ id: 'x', name: 'foo' }]
      const result = generateTableKey(data, 'id')
      expect(result[0]?.name).toBe('foo')
    })

    it('handles empty array', () => {
      const result = generateTableKey([], 'id')
      expect(result).toEqual([])
    })

    it('handles missing key field gracefully (returns array, possibly with NaN key)', () => {
      const data = [{ name: 'a' }]
      // @ts-expect-error - 测试边界
      const result = generateTableKey(data, undefined)
      // 实际实现不 throw（因为 spread + el[undefined] + i 不会 throw），返回带 NaN key 的项
      // 这里只验证不 crash 即可
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('extractServerTableQuery', () => {
    it('extracts pagination', () => {
      const q = extractServerTableQuery(
        { current: 2, pageSize: 50 },
        {},
        {}
      )
      expect(q.page).toBe(2)
      expect(q.pageSize).toBe(50)
    })

    it('defaults page=1, pageSize=20', () => {
      const q = extractServerTableQuery({}, {}, {})
      expect(q.page).toBe(1)
      expect(q.pageSize).toBe(20)
    })

    it('extracts sortBy from sorter.field', () => {
      const q = extractServerTableQuery(
        { current: 1, pageSize: 20 },
        {},
        { field: 'name', order: 'ascend' }
      )
      expect(q.sortBy).toBe('name')
      expect(q.sortOrder).toBe('asc')
    })

    it('maps descend to desc', () => {
      const q = extractServerTableQuery(
        { current: 1, pageSize: 20 },
        {},
        { field: 'name', order: 'descend' }
      )
      expect(q.sortOrder).toBe('desc')
    })

    it('handles array sorter (multi-column sort)', () => {
      const q = extractServerTableQuery(
        { current: 1, pageSize: 20 },
        {},
        [{ field: 'name', order: 'ascend' }, { field: 'age', order: 'descend' }]
      )
      expect(q.sortBy).toBe('name')
      expect(q.sortOrder).toBe('asc')
    })

    it('extracts enum filters, drops null/empty', () => {
      const q = extractServerTableQuery(
        { current: 1, pageSize: 20 },
        { type: ['admin', 'user'], status: null, age: [] },
        {}
      )
      expect(q.filters).toEqual({ type: ['admin', 'user'] })
    })

    it('converts filter values to string', () => {
      const q = extractServerTableQuery(
        { current: 1, pageSize: 20 },
        { count: [1, 2, 3] },
        {}
      )
      expect(q.filters).toEqual({ count: ['1', '2', '3'] })
    })

    it('omits filters when all empty', () => {
      const q = extractServerTableQuery(
        { current: 1, pageSize: 20 },
        { type: null, status: null },
        {}
      )
      expect(q.filters).toBeUndefined()
    })
  })

  describe('makeServerFilterProp', () => {
    it('produces filters array from enumValues', () => {
      const prop = makeServerFilterProp<{ role: string }>('role', ['admin', 'user'])
      expect(prop.filters).toEqual([
        { text: 'admin', value: 'admin' },
        { text: 'user', value: 'user' },
      ])
    })

    it('handles empty enum', () => {
      const prop = makeServerFilterProp<{ role: string }>('role', [])
      expect(prop.filters).toEqual([])
    })
  })

  describe('tableColumnsFilter (legacy)', () => {
    it('deduplicates string values by key', () => {
      const data = [
        { type: 'a', name: '1' },
        { type: 'a', name: '2' },
        { type: 'b', name: '3' },
      ]
      const { filters, onFilter } = tableColumnsFilter(data, 'type')
      expect(filters).toEqual([
        { text: 'a', value: 'a' },
        { text: 'b', value: 'b' },
      ])
      expect(onFilter('a', { type: 'a' } as any)).toBe(true)
      expect(onFilter('a', { type: 'b' } as any)).toBe(false)
    })

    it('skips non-string values', () => {
      const data = [
        { type: 1, name: '1' },
        { type: 'a', name: '2' },
      ]
      const { filters } = tableColumnsFilter(data, 'type')
      expect(filters).toEqual([{ text: 'a', value: 'a' }])
    })
  })
})
