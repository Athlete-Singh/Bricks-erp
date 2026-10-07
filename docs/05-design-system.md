# 05 — Design system

Brand: TVAM KEY deep green + gold. Calm, data-dense ERP on the web; big, high-contrast controls on mobile. Tokens live in **one place per platform**:
- Web: `web/src/styles/tokens.css` (CSS variables) → `web/tailwind.config.ts`
- Mobile: `mobile/lib/core/theme/` (`app_colors.dart`, `app_text_styles.dart`, `app_spacing.dart`, `app_theme.dart`)

## Colours
| Token | 50 | 100 | 200 | 300 | 400 | 500 | **600** | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|---|
| primary (green) | #E8F5EE | #C8E7D5 | #94D0AE | #5DB585 | #2E9A62 | #0F7F47 | **#0B6B3A** | #09572F | #074425 | #05321B |
| accent (gold) | #FDF6E3 | #FBE9BA | #F7D88A | #F2C55A | #EBB232 | **#E3A21A** | #C48812 | #9E6C0F | #78520D | #553A0A |

| Semantic | Light | Dark | Use |
|---|---|---|---|
| background | #F8FAF9 | #0B1210 | page |
| surface | #FFFFFF | #111A17 | cards, tables |
| surface-muted | #F1F5F3 | #18241F | table header, inputs |
| border | #E2E8F0 | #253430 | dividers |
| foreground | #0F172A | #E6EDEA | body text |
| muted-foreground | #64748B | #94A3A0 | secondary text |
| primary | #0B6B3A | #2E9A62 | primary buttons, active nav |
| accent | #E3A21A | #EBB232 | highlights, dashboard CTAs (sparingly) |
| success | #16A34A | #22C55E | posted, delivered, synced |
| warning | #D97706 | #F59E0B | pending, low stock |
| danger | #DC2626 | #EF4444 | errors, reversal, overdue |
| info | #2563EB | #3B82F6 | info, drafts |

White text on primary-600 ≈ 6.6:1 contrast (WCAG AA). Gold is never used for body text on white. Success is a brighter green than the brand and always comes with an icon or label, so it can't be confused with brand colour.

## Typography
Inter (web via `next/font`; mobile via system/Inter). Scale: 12 / 14 (body web) / 16 (body mobile) / 18 / 20 / 24 / 30. **Tabular numbers** (`font-variant-numeric: tabular-nums`, `.tabular`) for all money and quantity columns; right-align numbers.

## Spacing & shape
4-px grid: 4, 8, 12, 16, 24, 32, 48. Radius: 6 (inputs), 8 (cards), 12 (modals). Mobile touch targets ≥ 48 dp.

## Components
| Web (`components/ui`, `components/shared`) | Mobile (`core/widgets`) | When |
|---|---|---|
| Button (primary / secondary / ghost / danger) | AppButton | Any action |
| Input, MoneyInput, Select, DatePicker | AppTextField, AppDropdown, NumberStepper | Forms (stepper for brick counts) |
| Card, StatCard, ChartCard | AppCard | Grouped content, KPIs |
| DataTable (sort/filter/paginate) | — (lists) | Every list page |
| Badge | SyncStatusBadge | Status |
| Modal, ConfirmDialog, Toast | dialogs, snackbars | Confirm / feedback |
| Skeleton, EmptyState | AppLoader, EmptyView, ErrorView | Loading / empty / error |
| PageHeader, Sidebar, Topbar, KilnSwitcher | AppScaffold | Layout |

## Rules
- Never hard-code a colour, font size or spacing in a screen. Use tokens and components.
- Dark mode from day one (web: `class` strategy on `<html>`; mobile: `ThemeMode.system`).
- Web: the same PageHeader + filters + DataTable layout on every list page; keyboard-first forms.
- Mobile: high contrast for sunlight, minimal typing, clear online/offline/sync state.
