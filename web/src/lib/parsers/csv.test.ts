import { describe, it, expect } from 'vitest'
import { parseCsv, csvToJson, jsonToCsv } from './csv'

describe('parseCsv', () => {
  it('parses simple CSV', () => {
    const result = parseCsv('name,age\nAlice,30\nBob,25')
    expect(result.data).toHaveLength(3)
    expect(result.data[0]).toEqual(['name', 'age'])
    expect(result.data[1]).toEqual(['Alice', '30'])
  })

  it('parses with custom delimiter', () => {
    const result = parseCsv('name;age\nAlice;30', undefined, ';')
    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual(['name', 'age'])
  })

  it('returns empty data for empty input', () => {
    const result = parseCsv('')
    expect(result.data).toHaveLength(0)
  })
})

describe('csvToJson', () => {
  it('converts CSV with headers to JSON', () => {
    const result = csvToJson('name,age\nAlice,30\nBob,25')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ name: 'Alice', age: '30' })
  })

  it('auto-generates column names without headers', () => {
    const result = csvToJson('10,20\n30,40')
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveProperty('col_0')
    expect(result[0]).toHaveProperty('col_1')
  })

  it('parses CSV with semicolon delimiter', () => {
    const result = csvToJson('name;age\nAlice;30', ';')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ name: 'Alice', age: '30' })
  })

  it('parses CSV with tab delimiter', () => {
    const result = csvToJson('name\tage\nAlice\t30', '\t')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ name: 'Alice', age: '30' })
  })
})

describe('jsonToCsv', () => {
  it('converts JSON to CSV', () => {
    const result = jsonToCsv([{ name: 'Alice', age: '30' }, { name: 'Bob', age: '25' }])
    expect(result).toContain('name')
    expect(result).toContain('Alice')
    expect(result).toContain('Bob')
  })

  it('returns empty for empty array', () => {
    expect(jsonToCsv([])).toBe('')
  })

  it('uses custom delimiter', () => {
    const result = jsonToCsv([{ name: 'Alice', age: '30' }], ';')
    expect(result).toContain(';')
    expect(result).not.toContain(',')
  })
})
