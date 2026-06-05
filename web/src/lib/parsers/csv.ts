/**
 * CSV ↔ JSON 转换 — PapaParse 封装
 * 纯函数，只做数据转换，不做 DOM 操作
 */
import Papa from 'papaparse'
import type { ParseConfig, ParseResult as PapaResult } from 'papaparse'

/** CSV 解析结果 */
export interface ParseResult {
  data: string[][]
  errors: Array<{ row: number; message: string }>
  meta: {
    delimiter: string
    lineCount: number
  }
}

/**
 * 解析 CSV 文本为二维数组
 * @param text CSV 原始文本
 * @param encoding 文件编码（供上层在读取时使用，PapaParse 只接受字符串）
 * @param delimiter 自定义分隔符（默认自动检测）
 */
export function parseCsv(text: string, _encoding?: string, delimiter?: string): ParseResult {
  const config: ParseConfig = {
    header: false,
    skipEmptyLines: true,
    dynamicTyping: false,
  }

  if (delimiter) {
    config.delimiter = delimiter
  }

  const result: PapaResult<string[]> = Papa.parse(text, config)

  return {
    data: result.data,
    errors: result.errors.map((e) => ({
      row: e.row ?? 0,
      message: e.message,
    })),
    meta: {
      delimiter: result.meta.delimiter,
      lineCount: result.data.length,
    },
  }
}

/**
 * CSV 文本 → JSON 对象数组（自动检测表头行）
 * 如果第一行看起来像表头（非数字），则作为 key；否则自动生成 col_0, col_1...
 */
export function csvToJson(csvText: string, delimiter?: string): Record<string, string>[] {
  const { data } = parseCsv(csvText, undefined, delimiter)
  if (data.length === 0) return []

  const firstRow = data[0]
  const hasHeader = firstRow.some((cell) => isNaN(Number(cell)) && cell.trim().length > 0)
  const headers = hasHeader ? firstRow : firstRow.map((_, i) => `col_${i}`)
  const bodyRows = hasHeader ? data.slice(1) : data

  return bodyRows.map((row) => {
    const obj: Record<string, string> = {}
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] ?? ''
    }
    return obj
  })
}

/**
 * JSON 对象数组 → CSV 文本
 * @param data JSON 对象数组
 * @param delimiter 自定义分隔符（默认逗号）
 */
export function jsonToCsv(
  data: Record<string, string | number>[],
  delimiter?: string,
): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  if (delimiter) {
    return Papa.unparse(
      { fields: headers, data },
      { delimiter },
    )
  }

  return Papa.unparse({ fields: headers, data })
}
