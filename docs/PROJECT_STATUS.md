# Project Status

## Что реализовано

### Платформа
- Landing page (`/`) — показывает оба агента с описанием и CTA-кнопками
- Страница `/analyze` с выбором агента (Server Component + Client)
- API route (`POST /api/analyze`) — маршрутизирует по `agentType`
- AI provider layer: OpenRouter по умолчанию, Claude подключается через `AI_PROVIDER=claude`
- Supabase server-side хранение отчётов — каждый отчёт получает UUID
- Страница `/report/[id]` — Server Component + Client UI с агент-специфичным header/badge
- Fallback страница `/report` — localStorage для старых сессий
- `model_used` сохраняется в БД
- `agent_type` сохраняется в БД

### UX форм и загрузка файлов
- Формы: 5 полей каждый агент, без скрытых секций и коллапса
- Тип бизнеса «Другое» показывает дополнительное обязательное поле «Укажите тип бизнеса или нишу» (хранится в `industry`)
- P&L Agent поддерживает 3 способа передать данные: Excel upload, Google Sheets ссылка, ручная вставка
- Google Sheets import: server-side route `/api/import/google-sheet` скачивает XLSX через Google export API, клиент обрабатывает через тот же Excel ingestion pipeline (sheet selector, preview, quality gate)
- Требует доступ «Anyone with the link → Viewer». Приватные таблицы без OAuth не поддерживаются
- File upload: drag & drop или клик, поддерживаемые форматы — `.txt`, `.csv`, `.md`, `.json`
- Файл читается через `FileReader` как текст, вставляется в соответствующее поле формы:
  - P&L Agent → в `pnlText`
  - Goldratt Agent → в `mainPain`
- При загрузке файла показывается имя файла и статус «Файл загружен и добавлен в анализ»
- Неподдерживаемый формат → сообщение с инструкцией по copy-paste
- Текст из файла сохраняется в localStorage draft как обычный textarea
- Очистка формы сбрасывает и загруженный файл

### Два AI-агента

**P&L Agent** (`agentType: 'pnl'`)
- Фокус: финансовый анализ P&L, расходы, рентабельность, главное ограничение прибыли
- System prompt: `src/lib/ai/prompts/pnlPrompt.ts`
- User prompt builder: `buildPnlUserPrompt`
- Структура отчёта: 14 разделов (`Краткий итог` → `Ограничения анализа`)
- Цветовая схема: emerald/teal
- URL: `/analyze?agent=pnl`

**Goldratt Agent** (`agentType: 'goldratt'`)
- Фокус: Теория ограничений, Throughput/Inventory/OE, Five Focusing Steps
- System prompt: `src/lib/ai/prompts/goldrattPrompt.ts`
- User prompt builder: `buildGoldrattUserPrompt`
- Структура отчёта: 5 разделов (Главное ограничение → Что проверить дальше)
- Цветовая схема: violet/purple
- URL: `/analyze?agent=goldratt`

### Demo Mode
- `/demo/pnl` и `/demo/goldratt` — статические страницы с вымышленными отчётами
- Тот же `ReportDisplay` компонент с prop `isDemo=true` — показывает синюю плашку «Демо-отчёт»
- Данные в `src/lib/demoReports.ts` (`demoPnlReport`, `demoGoldrattReport`)
- Кнопка «Пример» добавлена на landing page рядом с CTA каждого агента
- Ссылка «Посмотреть пример отчёта» появляется в error banner на `/analyze` при ошибке AI
- Не требует OpenRouter, Supabase, env vars — работает всегда

### Storage
- localStorage drafts раздельно по агентам:
  - `pnl-form-draft` — черновик P&L формы
  - `goldratt-form-draft` — черновик Goldratt формы
- Переключение между агентами не теряет данные
- Fallback localStorage для отчётов при `DB_SAVE_FAILED`

### Типы
- `AgentType = 'pnl' | 'goldratt'` в `src/lib/types.ts`
- `AnalyzeFormFields` включает поля обоих агентов
- `ReportPageData` включает `agentType`
- `AIResponse = { content, modelUsed }` — возвращается провайдером

### DB schema (`reports` table)
```sql
id UUID PRIMARY KEY
created_at TIMESTAMPTZ
name, email, telegram, company TEXT
business_type, industry, geography, team TEXT
current_revenue, current_margin, target_margin TEXT
main_pain, tried_before, extra_context TEXT
pnl_text TEXT
report TEXT NOT NULL
model_used TEXT
agent_type TEXT DEFAULT 'pnl'
status TEXT DEFAULT 'completed'
error_message TEXT
```

## Текущий flow

```
/ → выбор агента → /analyze?agent=pnl|goldratt
→ POST /api/analyze (с agentType)
    ├── выбор system prompt по agentType
    ├── AI генерирует отчёт (Claude или OpenRouter — зависит от `AI_PROVIDER`)
    └── Supabase: сохранение с agent_type → { id }
→ /report/[id] (header/badge по agentType)
```

## AI Provider

Провайдер переключается через env `AI_PROVIDER` без изменения кода:

| `AI_PROVIDER` | Реализация | Файл |
|---|---|---|
| `openrouter` (default) | `OpenRouterProvider` | `src/lib/ai/openrouter.ts` |
| `claude` | `ClaudeProvider` | `src/lib/ai/claude.ts` |

Фабрика `createAIProvider()` в `src/lib/ai/index.ts` — логика выбора.  
Если `AI_PROVIDER` пустой → OpenRouter. Если неизвестный → warning + OpenRouter.

**Чтобы подключить Claude:**
1. Добавить `ANTHROPIC_API_KEY=sk-ant-...`
2. Установить `AI_PROVIDER=claude` (опционально `CLAUDE_MODEL=...`)
3. Перезапустить dev server или сделать Redeploy на Vercel

Если `AI_PROVIDER=claude`, но `ANTHROPIC_API_KEY` отсутствует, система не делает silent fallback на OpenRouter. API возвращает `NOT_CONFIGURED`, а в server logs появляется `[AI] provider=claude missing ANTHROPIC_API_KEY`.

Для передачи другому разработчику нужны env:

```env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=...
CLAUDE_MODEL=claude-3-5-sonnet-latest
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=...
```

- После смены env локально нужен перезапуск `npm run dev`
- После смены env на Vercel нужен Redeploy
- Если в логах запросов provider всё ещё `openrouter`, значит новый env не применился
- Текущий владелец проекта может локально использовать OpenRouter; Excel quality gate и hard block от этого не зависят

P&L и Goldratt промпты менять не нужно — оба агента используют общий provider layer.

Для production рекомендуется Claude или платная OpenRouter модель вместо free tier.

## Что пока не реализовано

- Email уведомления
- Авторизация пользователей (история по аккаунту)
- Очередь задач (job queue для AI-запросов)
- Панель администратора
- Парсинг PDF на сервере (Excel `.xlsx` уже поддерживается на клиенте через sheet selector, preview и quality gate)
- RLS-политики Supabase
- Rate limiting (сейчас in-memory, не shared между serverless instances)
- Тесты (unit / integration)

## Известные ограничения

- Free-модели OpenRouter нестабильны: задержки 1–3 минуты, ошибки 429 и возможная смена реальной underlying model
- Нет RLS — все отчёты доступны по UUID без авторизации
- Нет rate limiting

## Следующий технический этап

1. **Очередь задач** — вынести AI-запросы в background job (Inngest / BullMQ)
2. **Email** — отправка отчёта на email после генерации
3. **Авторизация** — Supabase Auth, история отчётов по аккаунту
4. **RLS-политики** — ограничить доступ к отчётам
5. **Загрузка файлов** — парсинг PDF на сервере
6. **Панель администратора**

## Обработка edge cases

| Ситуация | Поведение |
|----------|-----------|
| Нет `OPENROUTER_API_KEY` | API возвращает `NOT_CONFIGURED` |
| Нет Supabase env vars | `getReportById` → `null`; `saveReportToDatabase` → бросает, API возвращает `DB_SAVE_FAILED` |
| AI вернул ошибку | `AI_TIMEOUT` / `AI_RATE_LIMITED` / `AI_PROVIDER_ERROR`; форма остаётся с данными |
| Supabase save упал (AI OK) | `DB_SAVE_FAILED` + `report`; клиент сохраняет в localStorage; жёлтое предупреждение |
| `/report/[id]` с некорректным UUID | UUID regex guard — DB не трогается; показывается NotFound |
| `/report/[id]` — отчёт не найден | Empty state «Отчёт не найден» + кнопка |
| Supabase PGRST116 | Логируется как ожидаемый случай, не как ошибка |
| Старые отчёты без `agent_type` | Default = `'pnl'` (column default в DB) |

## Техдолг

- Нет тестов (unit / integration)
- Нет внешнего мониторинга ошибок (Sentry / etc)
- Goldratt-специфичные поля не хранятся отдельно в DB (только в report)

## P1 fixes applied

- `npm run lint` приведён к чистому состоянию: исправлены React hooks lint errors и unused imports.
- Добавлен MVP in-memory rate limit на `POST /api/analyze`: 5 запросов за 10 минут на IP. Это временная защита для MVP; для production нужен Redis/Upstash/Vercel KV.
- AI/OpenRouter ошибки нормализованы. Клиент больше не получает raw upstream provider messages; raw errors остаются в server logs.
- Поддерживаемые API error codes: `VALIDATION_ERROR`, `RATE_LIMITED`, `NOT_CONFIGURED`, `AI_TIMEOUT`, `AI_RATE_LIMITED`, `AI_PROVIDER_ERROR`, `AI_EMPTY_RESPONSE`, `DB_SAVE_FAILED`, `INTERNAL_ERROR`.
- `model_used` теперь читается из Supabase и отображается в `ReportDisplay`.
- `/api/analyze` настроен как Node.js route handler с `maxDuration = 180` для long-running AI requests на Vercel.
- `next.config.ts` задаёт `turbopack.root`, чтобы Next.js не выбирал parent workspace root из-за лишнего `package-lock.json`.

## P1 fixes (round 2)

- Server-side P&L quality gate добавлен в `POST /api/analyze`: если `agentType=pnl` и `pnlText` содержит мусор (менее 3 чисел, все нули, нет ключевых слов выручки и расходов), AI не вызывается — возвращается `400 VALIDATION_ERROR`.
- Тип бизнеса «Другое» в обеих формах (P&L и Goldratt) показывает дополнительное обязательное поле «Укажите тип бизнеса или нишу». Значение хранится в `industry` и попадает в AI-промпт. Форма блокирует сабмит, если поле пустое.

## Pre-demo Excel ingestion hardening

- P&L Agent больше не отправляет первый Excel-лист вслепую: все листы получают metadata и quality score, лучший лист выбирается автоматически, пользователь может выбрать другой.
- Добавлен preview “Проверьте данные перед анализом”: файл, лист, строки, колонки, score, warnings и первые строки нормализованной таблицы.
- Добавлен client-side quality gate: пустые, нулевые, битые и непохожие на P&L листы блокируют запуск AI до запроса в `/api/analyze`.
- Excel normalizer удаляет пустые строки/колонки, добавляет metadata в начало `pnl_text`, ограничивает размер normalized text и помечает обрезку warning.
- Добавлен Excel-шаблон `public/templates/pnl-template.xlsx`; Google Sheets CTA предусмотрен, ссылка добавляется в `GOOGLE_SHEETS_TEMPLATE_URL`.
- Report UI показывает блок “Данные, использованные для анализа” из сохранённого `pnl_text`.
- `/report` fallback и report not found приведены к light dashboard theme.
- API route пишет structured logs без полного P&L/raw prompt: requestId, provider, model, agentType, input length, AI/DB duration, report length и source metadata count.

## Production notes

- In-memory rate limit не общий между serverless instances. Для публичного production заменить на Redis/Upstash/Vercel KV.
- AI generation может занимать долгое время. Для production лучше добавить queue/background jobs и проверить лимиты Vercel plan.
- Free OpenRouter models остаются нестабильным местом. Архитектура готова к отдельному Claude/OpenAI provider через текущий `AIProvider` interface.
- Если нужен стабильный handoff для другого разработчика, рекомендуется `AI_PROVIDER=claude`. OpenRouter остаётся fallback-вариантом для локальной проверки и demo без Claude key.
- Для production нужен Claude/OpenAI или платная OpenRouter model вместо free router.

## Current env example

```env
AI_PROVIDER=openrouter

OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemma-4-31b-it:free

ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-3-5-sonnet-latest

NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Полный шаблон: `.env.example` в корне `platform/`.

## OpenRouter routing

- Primary model берётся из `OPENROUTER_MODEL`, а если env пустой, дефолт = `google/gemma-4-31b-it:free`
- Если primary не ответил, provider пробует fallback: `openai/gpt-oss-120b:free`, `nvidia/nemotron-3-super-120b-a12b:free`
- `modelUsed` старается сохранить реальную модель из ответа OpenRouter; если router её не вернул, сохраняется отправленная модель
