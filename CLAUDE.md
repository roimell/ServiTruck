# Project Context

<!-- Optimized following context-optimization principles: minimal upfront, lazy load details -->
<!-- Reference: .claude/context-optimization-guide.md -->

## Stack & Tools
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **Payments:** Escrow model (checkout_session_id)
- **Email:** Resend
- **Analytics:** Vercel Analytics + custom eventos_busqueda
- **Deploy:** Vercel

## Hard Rules
1. Use dedicated tools (Read, Edit, Grep, Glob) over Bash equivalents
2. Prefer editing existing files over creating new ones
3. No secrets in committed files
4. Structured logging at boundaries only

## Skill Triggers
<!-- Add project-specific skill triggers as needed -->
| Triggers | Action |
|----------|--------|
| design, UI, frontend, page, component | Skill("frontend-design:frontend-design") |
| spreadsheet, xlsx, csv | Skill("anthropic-skills:xlsx") |
| pdf, merge pdf, split pdf | Skill("anthropic-skills:pdf") |
| word, docx, document | Skill("anthropic-skills:docx") |
| slides, presentation, pptx | Skill("anthropic-skills:pptx") |
| claude api, anthropic sdk | Skill("claude-api") |

## Conventions
- DB: Spanish table/column names (servicios, solicitudes_trabajo, etc.)
- Code: English variable names, Spanish UI copy
- States flow: pendiente → pagado_custodia → en_progreso → terminado → completado_fondos_liberados
- RLS enforced on all tables
- Reviews only allowed on estado = 'completado_fondos_liberados'
