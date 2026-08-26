# Design

<!-- impeccable:design-schema 1 -->

## World

Luxury dark Tiermaker. Saturated color blocks name each rank. Models are chips with a lab mark on a white tile. The page glows from the top, not a ruled sheet.

## Palette

| Token | Hex | Role |
| --- | --- | --- |
| ground | `#080808` | Page, with a `#202126` radial wash |
| panel | `#0e0e0f` | Tables and frames |
| rule | `#292a2d` | Hairlines |
| ink | `#f5f5f7` | Primary text |
| ink-dim | `#8d8e94` | Secondary text |
| primary | `#f5f5f7` | Submit and export |
| S+ | `#ff244d` | Top rank |
| S | `#ff6a1a` | |
| A | `#ff9500` | |
| B | `#ffca28` | |
| C | `#13d6a2` | |
| D | `#bd5df3` | |
| F | `#f72fa6` | |
| Unranked | `#60646c` | Pool |

Label ink on color blocks is `#070708`. Unranked uses paper ink.

## Type

Public Sans. 15px body, 13px UI, 28px board title, 28px / 900 tier letters. Tracking to `-0.04em` on titles only.

## Layout

Page width 1260px. Each rank is its own rounded row, 10px gap between rows. Title column 116px. Chips 52px tall, logo 36px, name ellipsis. Tables `table-layout: fixed`.

## Components

- Nav: segmented dark pill, current page is `#2a2b2f`.
- Chip: dark gradient, 8px radius, 3px lift on hover. Selected is a white ring, not inversion.
- Logo: white rounded tile, mark contained, never overlapping the name.
- Empty lanes keep the drop hint. Helper copy lives in the Unranked head.

## Motion

Chip lift and press scale only. `prefers-reduced-motion` disables transform.
