import type { StoredReport } from '@/lib/types'

export type { StoredReport }

const REPORT_KEY = 'pereboot_report'

export function saveReport(data: StoredReport): void {
  try {
    localStorage.setItem(REPORT_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable
  }
}

export function getReport(): StoredReport | null {
  try {
    const raw = localStorage.getItem(REPORT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredReport
  } catch {
    return null
  }
}

export function clearReport(): void {
  try {
    localStorage.removeItem(REPORT_KEY)
  } catch {
    // ignore
  }
}
