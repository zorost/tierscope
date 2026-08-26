# Design

<!-- impeccable:design-schema 1 -->

## World

Dark FIDE ranking sheet. Models are pairing slips that move between title rows. Four inks only. No hero, no icon-card grid, no rainbow tiers.

## Palette

| Token | Hex | Role |
| --- | --- | --- |
| ground | `#10110e` | Page |
| panel | `#161712` | Sheet fill |
| rule | `#2e3028` | Hairlines |
| ink | `#f4f2eb` | Primary text |
| ink-dim | `#c8c4b6` | Secondary text (≥4.5:1 on ground) |
| gold | `#c9a227` | S+/S titles and the one primary action |
| gold-ink | `#1a1608` | Text on gold |

## Type

Public Sans, 15px body, 13px UI, 24px page titles, 18px wordmark. Tabular numerals. Tracking no tighter than -0.03em on titles.

## Layout

8px grid. Page width 1200px. Title column 72px. Ruled rows, not cards. Chips max 240px with ellipsis. Tables `table-layout: fixed`.

## Components

- Nav current page: inverted ink on ground.
- Chip selected: same inversion.
- Buttons: 36px, 1px rule, `scale(0.97)` on press, 160ms ease-out.
- Empty tiers stay empty. Helper copy lives once, in the unplaced head.

## Motion

Press feedback only. No page-load choreography. `prefers-reduced-motion` disables transform.
