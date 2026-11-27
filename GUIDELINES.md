# Project Guidelines

Hackathon MVP rules — enough structure to move fast without creating a mess. Not enterprise policy. When a rule and shipping speed conflict, ship, then leave a `// TODO` note.

## File size

- Soft limit: **250 lines** per file (`.ts`/`.tsx`).
- Hard limit: **400 lines** — split before you cross this.
- Exempt: anything under `src/generated/**` (Prisma output) and `src/components/ui/*.tsx` files added by the `shadcn` CLI (vendor code — see Components section below). Don't hand-edit either category for size; if a shadcn file needs a real change, treat it like any other file you own once you've modified it.
- Split by extracting:
  - Page files (`page.tsx`) with heavy UI → pull sections into `components/<feature>/`.
  - Long API routes → move business logic into `lib/<feature>.ts`, keep the route handler as validate → call → respond.

Currently over the limit: `meeting/MeetingPageClient.tsx` (267 lines) — dominated by 100ms SDK join/track-retry logic that doesn't split cleanly; under the 400-line hard limit, leave as-is unless it grows further.

## Project structure

- `src/app/**` — routes and pages only. Page components wire up data + layout; they shouldn't contain business logic or giant JSX trees.
- `src/app/api/**` — route handlers. Keep the handler thin: parse input → call `lib` → return `NextResponse.json(...)`. No raw SQL or multi-step logic inline once it exceeds ~20 lines.
- `src/components/<feature>/` — one component per file, grouped by feature (`chat/`, `admin/`, `auth/`, `property/`, etc.). Shared primitives (buttons, inputs, modals) go in `components/ui/`.
- `src/lib/<feature>.ts` — server-side business logic, external API clients, DB helpers. This is where reusable logic lives, not in route handlers or components.
- `src/hooks/` — shared client hooks (`useAuth`, etc.).

## API routes

Every route handler follows this shape:

```ts
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    // validate body here, return 400 on bad input

    // do the work (prefer calling into src/lib/*)

    return NextResponse.json({ ...result })
  } catch (error) {
    console.error('<route name> error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

- Auth check first, before touching the body.
- Validate required fields and return `400` with a clear message — don't let bad input reach Prisma.
- Never leak raw error objects or stack traces in the response; log server-side with `console.error`, return a generic message.
- Status codes: `400` bad input, `401` not logged in, `403` logged in but not allowed, `404` not found, `500` unexpected.

## Components

- One component per file. Default export for pages, named export for everything else (matches current convention).
- `'use client'` only on components that actually need interactivity (state, effects, event handlers, browser APIs). Server Components by default.
- Co-locate a component's own small helper functions in the same file; promote to `lib/` only once a second file needs it.
- Keep JSX readable: if a component's render function needs more than ~3 levels of nested conditionals, extract a subcomponent.

### Interactive primitives: use shadcn/ui, don't hand-roll

For anything with real interaction logic — modals, dropdowns, tabs, popovers, selects, tooltips — reach for `shadcn/ui` instead of writing a manual `fixed inset-0` div with your own open/close state and no keyboard handling. It's already wired up:

```bash
pnpm dlx shadcn@latest add <component>
```

This drops accessible, Radix-backed source into `src/components/ui/` (owned code you can edit, not a node_modules black box — focus trapping, Escape-to-close, and portal rendering come for free). Compose it the way `MeetingRequestModal.tsx` and `src/app/profile/page.tsx` already do: `Dialog`/`DialogContent` for modals, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` for tabs. Style with our own CSS vars (`var(--surface)`, `var(--accent)`, etc.) via `className`, not shadcn's default theme — see Styling below for why that still looks like *our* brand, not a generic template.

Plain `<button className="btn-primary">`/`<input className="input-clean">` are still fine for simple, non-overlay UI — you don't need a shadcn component for a form field or a static button.

## Styling — use the existing design system, don't invent a new one

This project has a deliberate visual identity, not the default AI-generated look: a flat, hairline-bordered "architectural ledger" aesthetic — ink/mist neutrals, a warm brass accent (not teal, not a SaaS-generic blue/green), Space Grotesk for display type, Manrope for body, IBM Plex Mono for data. It's implemented as CSS variables + Tailwind v4 `@theme inline` in `src/app/globals.css`, with light/dark mode via `prefers-color-scheme`. Use it:

- Colors: use the existing CSS vars (`--background`, `--foreground`, `--surface`, `--surface-muted`, `--accent`/`--accent-strong`/`--accent-soft`, `--success`, `--danger`, `--border`, `--muted`) via Tailwind arbitrary values (`bg-[var(--surface)]`, `text-[color:var(--muted)]`) or the existing utility classes (`.surface-card`, `.btn-primary`, `.btn-secondary`, `.input-clean`, `.chip`, `.eyebrow`, `.link-accent`, `.hairline-row`, `.media-placeholder`, `.stat-figure`). Don't introduce new hardcoded hex values or fall back to Tailwind's default palette (`stone-*`, `emerald-*`, `gray-*` etc.) — that's exactly the inconsistency this system replaced.
- The accent is **brass** (`--accent` / `--accent-strong`), used deliberately sparingly — one bold color, reserved for primary actions and emphasis. Don't add a second loud accent per feature; status colors are `--success` (moss) and `--danger`, both already defined with `-soft` background variants for badges.
- shadcn components read a parallel set of semantic tokens (`--primary`, `--card`, `--destructive`, etc., defined in the `@theme inline` block) that are already mapped onto the above — a shadcn `Button` or `Badge` automatically renders in brass/ink, not shadcn's default gray. Don't rename or repoint these without checking what already depends on them.
- No ALL-CAPS tracked eyebrow labels (`text-xs uppercase tracking-...`) — use the `.eyebrow` class (sentence case, small accent dot) instead. It's a deliberate anti-pattern call-out: all-caps micro-labels are one of the most common "this was AI-generated" tells.
- Headings/display text use `.font-display` or `.section-title` (Space Grotesk); numbers that matter (prices, stats, counts) use `.stat-figure` for tabular figures — don't let them render in the default body font.
- Fonts are already set — don't import new font families per page (this includes not reintroducing a `shadcn init`-style Geist font if you ever re-run the shadcn CLI; it does not own `--font-sans`, we do, see `@theme inline`).
- Every interactive page should work in both light and dark mode (the tokens already do this for free if you use them instead of hardcoded `bg-white`/`text-black`).
- Prefer Tailwind utility classes over new CSS files. Only drop into `globals.css` for truly global concerns (tokens, base resets, new shared utility classes used 3+ places).

## TypeScript

- No `any`. If a third-party type is genuinely unknown, use `unknown` and narrow it.
- Don't suppress errors with `@ts-expect-error` / `@ts-ignore` — fix the type. If a library's types are wrong, add a narrow local type instead of suppressing.
- Keep `pnpm exec tsc --noEmit` clean before committing (note: needs `NODE_OPTIONS=--max-old-space-size=6144` locally — the `googleapis` types are large).

## Environment variables

- Every env var used in code must have a matching entry in `.env.example` (create/update this file when you add a new var) with a one-line comment on what it's for.
- Never commit `.env` (already gitignored — keep it that way).
- Guard optional integrations at the point of use (`if (!process.env.X) return NextResponse.json({ error: '...' }, { status: 500 })`) rather than crashing the whole app at import time.

## Error handling

- Don't add try/catch "just in case" around code that can't throw. Do add it around anything doing I/O: DB calls, `fetch` to external APIs, file parsing.
- User-facing error messages should be short and in plain language ("Login failed" not the raw Prisma error). Full detail goes to `console.error` only.
- Don't silently swallow errors (empty `catch {}`) unless the failure is genuinely non-critical (e.g. a non-blocking analytics ping) — and if you do, leave a one-line comment saying why.

## What we're explicitly NOT doing (MVP, not production)

- No test suite requirement. If you have time, a few smoke tests on auth and payments are the highest-value place to spend it — not required to ship.
- No strict commit/branch conventions — just write a commit message that says what changed.
- No enforced 100% type coverage on generated Prisma output.
- No accessibility audit — but don't actively break basics (use real `<button>`/`<label>` elements, keep color contrast readable in both themes).
