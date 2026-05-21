import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

function parseGoogleSheetsUrl(raw: string): { spreadsheetId: string; gid: string | null } | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }

  if (url.hostname !== 'docs.google.com') return null

  const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return null

  const spreadsheetId = match[1]

  // gid can appear as hash (#gid=123) or query param (?gid=123)
  const gidFromHash = url.hash.match(/gid=(\d+)/)?.[1] ?? null
  const gidFromQuery = url.searchParams.get('gid')
  const gid = gidFromHash ?? gidFromQuery ?? null

  return { spreadsheetId, gid }
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()

  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Некорректный формат запроса.', code: 'VALIDATION_ERROR', requestId },
      { status: 400 },
    )
  }

  const raw = body.url ?? ''
  const parsed = parseGoogleSheetsUrl(raw)

  if (!parsed) {
    return NextResponse.json(
      {
        error: 'Не удалось распознать ссылку Google Sheets. Проверьте ссылку и попробуйте ещё раз.',
        code: 'INVALID_URL',
        requestId,
      },
      { status: 400 },
    )
  }

  const { spreadsheetId, gid } = parsed
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`

  let response: Response
  try {
    response = await fetch(exportUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(20_000),
      redirect: 'follow',
    })
  } catch (err) {
    console.error('[google-sheet] fetch failed', { requestId, error: err })
    return NextResponse.json(
      {
        error: 'Не удалось загрузить Google Sheets. Попробуйте скачать таблицу как Excel и загрузить файл вручную.',
        code: 'FETCH_ERROR',
        requestId,
      },
      { status: 502 },
    )
  }

  // Google redirects to login page (HTML) when spreadsheet is private
  const contentType = response.headers.get('content-type') ?? ''
  const isXlsx =
    contentType.includes('application/vnd.openxmlformats') ||
    contentType.includes('application/octet-stream') ||
    contentType.includes('application/zip')

  if (response.status === 401 || response.status === 403) {
    return NextResponse.json(
      {
        error: 'Не удалось загрузить таблицу. Проверьте, что открыт доступ: Anyone with the link → Viewer.',
        code: 'PRIVATE_SHEET',
        requestId,
      },
      { status: 403 },
    )
  }

  if (!response.ok || !isXlsx) {
    console.error('[google-sheet] unexpected response', { requestId, status: response.status, contentType })
    return NextResponse.json(
      {
        error: 'Не удалось прочитать Google Sheets. Возможно, таблица закрыта настройками доступа.',
        code: 'NOT_XLSX',
        requestId,
      },
      { status: 422 },
    )
  }

  // Stream response into buffer with size limit
  const reader = response.body?.getReader()
  if (!reader) {
    return NextResponse.json(
      { error: 'Не удалось прочитать ответ сервера.', code: 'FETCH_ERROR', requestId },
      { status: 502 },
    )
  }

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_BYTES) {
      reader.cancel()
      return NextResponse.json(
        {
          error: 'Таблица слишком большая. Скачайте нужный лист как Excel и загрузите его вручную.',
          code: 'TOO_LARGE',
          requestId,
        },
        { status: 413 },
      )
    }
    chunks.push(value)
  }

  const buffer = Buffer.concat(chunks)
  const bufferBase64 = buffer.toString('base64')

  console.info('[google-sheet] success', { requestId, source: 'google_sheets', bytes: totalBytes })

  return NextResponse.json({
    filename: 'Google Sheets.xlsx',
    bufferBase64,
    spreadsheetId,
    gid,
    source: 'google_sheets',
  })
}
