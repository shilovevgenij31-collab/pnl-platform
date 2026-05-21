# Project Status

## Что реализовано

### Платформа
- Landing page (`/`) — показывает оба агента с описанием и CTA-кнопками
- Страница `/analyze` с выбором агента (Server Component + Client)
- API route (`POST /api/analyze`) — маршрутизирует по `agentType`
- OpenRouter client с primary router `openrouter/free` и explicit fallback на конкретные free-модели
- Supabase server-side хранение отчётов — каждый отчёт получает UUID
- Страница `/report/[id]` — Server Component + Client UI с агент-специфичным header/badge
- Fallback страница `/report` — localStorage для старых сессий
- `model_used` сохраняется в БД
- `agent_type` сохраняется в БД

### UX форм и загрузка файлов
- Формы упрощены: основной блок виден сразу, дополнительные поля скрыты в коллапсе
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
- Фокус: финансовый анализ P&L, расходы, рентабельность, bottleneck
- System prompt: `src/lib/ai/prompts/pnlPrompt.ts`
- User prompt builder: `buildPnlUserPrompt`
- Структура отчёта: 14 разделов (Executive Summary → Ограничения анализа)
- Цветовая схема: emerald/teal
- URL: `/analyze?agent=pnl`

**Goldratt Agent** (`agentType: 'goldratt'`)
- Фокус: Теория ограничений, Throughput/Inventory/OE, Five Focusing Steps
- System prompt: `src/lib/ai/prompts/goldrattPrompt.ts`
- User prompt builder: `buildGoldrattUserPrompt`
- Структура отчёта: 12 разделов (Карта бизнеса → Ограничения анализа)
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
    ├── AI генерирует отчёт (OpenRouter)
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

P&L и Goldratt промпты менять не нужно — оба агента используют общий provider layer.

Для production рекомендуется Claude или платная OpenRouter модель вместо free tier.

## Что пока не реализовано

- Email уведомления
- Авторизация пользователей (история по аккаунту)
- Очередь задач (job queue для AI-запросов)
- Панель администратора
- Парсинг PDF на сервере (Excel `.xlsx` уже поддерживается на клиенте)
- RLS-политики Supabase
- Rate limiting (сейчас in-memory, не shared между serverless instances)
- Тесты (unit / integration)

## Известные ограничения

- OpenRouter Free Router (`openrouter/free`) нестабилен: задержки 1–3 минуты, ошибки 429 и возможная смена реальной underlying model
- Нет production-ready AI provider
- Нет RLS — все отчёты доступны по UUID без авторизации
- Нет rate limiting

## Следующий технический этап

1. **Production AI provider** — добавить `src/lib/ai/claude.ts`, переключить фабрику
2. **Очередь задач** — вынести AI-запросы в background job (Inngest / BullMQ)
3. **Email** — отправка отчёта на email после генерации
4. **Авторизация** — Supabase Auth, история отчётов по аккаунту
5. **RLS-политики** — ограничить доступ к отчётам
6. **Загрузка файлов** — парсинг Excel/CSV на сервере
7. **Панель администратора**

## Обработка edge cases

| Ситуация | Поведение |
|----------|-----------|
| Нет `OPENROUTER_API_KEY` | API возвращает `NOT_CONFIGURED` |
| Нет Supabase env vars | `getReportById` → `null`; `saveReportToDatabase` → бросает, API возвращает `DB_SAVE_FAILED` |
| AI вернул ошибку | `AI_ERROR`; форма остаётся с данными |
| Supabase save упал (AI OK) | `DB_SAVE_FAILED` + `report`; клиент сохраняет в localStorage; жёлтое предупреждение |
| `/report/[id]` с некорректным UUID | UUID regex guard — DB не трогается; показывается NotFound |
| `/report/[id]` — отчёт не найден | Empty state «Отчёт не найден» + кнопка |
| Supabase PGRST116 | Логируется как ожидаемый случай, не как ошибка |
| Старые отчёты без `agent_type` | Default = `'pnl'` (column default в DB) |

## Техдолг

- Нет тестов (unit / integration)
- Нет логирования запросов (только console.error)
- Нет мониторинга ошибок (Sentry / etc)
- Goldratt-специфичные поля не хранятся отдельно в DB (только в report)

## P1 fixes applied

- `npm run lint` приведён к чистому состоянию: исправлены React hooks lint errors и unused imports.
- Добавлен MVP in-memory rate limit на `POST /api/analyze`: 5 запросов за 10 минут на IP. Это временная защита для MVP; для production нужен Redis/Upstash/Vercel KV.
- AI/OpenRouter ошибки нормализованы. Клиент больше не получает raw upstream provider messages; raw errors остаются в server logs.
- Поддерживаемые API error codes: `VALIDATION_ERROR`, `RATE_LIMITED`, `NOT_CONFIGURED`, `AI_TIMEOUT`, `AI_RATE_LIMITED`, `AI_PROVIDER_ERROR`, `AI_EMPTY_RESPONSE`, `DB_SAVE_FAILED`, `INTERNAL_ERROR`.
- `model_used` теперь читается из Supabase и отображается в `ReportDisplay`.
- `/api/analyze` настроен как Node.js route handler с `maxDuration = 180` для long-running AI requests на Vercel.
- `next.config.ts` задаёт `turbopack.root`, чтобы Next.js не выбирал parent workspace root из-за лишнего `package-lock.json`.

## Production notes

- In-memory rate limit не общий между serverless instances. Для публичного production заменить на Redis/Upstash/Vercel KV.
- AI generation может занимать долгое время. Для production лучше добавить queue/background jobs и проверить лимиты Vercel plan.
- Free OpenRouter models остаются нестабильным местом. Архитектура готова к отдельному Claude/OpenAI provider через текущий `AIProvider` interface.
- Текущая временная рекомендуемая модель для MVP/demo: `OPENROUTER_MODEL=openrouter/free`. Router сам выбирает доступную бесплатную модель.
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

- Primary model берётся из `OPENROUTER_MODEL`, а если env пустой, дефолт = `openrouter/free`
- Если `openrouter/free` не ответил, provider пробует fallback: `google/gemma-4-31b-it:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `openai/gpt-oss-20b:free`
- `modelUsed` старается сохранить реальную модель из ответа OpenRouter; если router её не вернул, сохраняется отправленная модель, например `openrouter/free`
