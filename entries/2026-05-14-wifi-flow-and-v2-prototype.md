---
title: "Fortnightly #2: Wi-Fi flow refactor and V2 prototype on the bench"
date: 2026-05-14
tweet: "Fortnightly #2: Wi-Fi flow refactor for BlackBox — scan, password, settings screens plus qwerty, toggle, modal, scrollbar primitives. Dropped procedural icons, kept PNGs. V2 prototype on the bench; NFC + Fiber integrations next."
summary: "Wi-Fi flow refactor lands three new screens and a set of new UI primitives; V2 prototype board on the bench; NFC and Fiber integrations planned."
tags: ["wave-2", "ui", "hardware"]
version: "0.3.0-dev"
do_not_post: true
thread:
  - "Wi-Fi screens: scan (list + scrollbar + loading), password (qwerty + green tick), settings (toggle + masking + error modal). New png_icons.{h,cpp} replaces the dropped procedural icons.cpp — quality tradeoff wasn't worth the flash."
  - "New ui_primitives: draw_qwerty/hit_qwerty (+ KEY_* codes), draw_modal/hit_modal_ok, draw_toggle/hit_toggle, draw_password_field/hit_password_eye, draw_network_row, draw_scrollbar/hit_scrollbar. Static review of Step 4 wiring done."
  - "Hardware side: V2 prototype board on the bench, early testing started. NFC integration planned, and researched candidate Fiber integrations for the next round of work."
---

A steady fortnight — UI rework continuing, with forward planning on both hardware and integrations. The goal of this stretch is to lock the UI down so the more advanced integrations can move.

## UI — Wi-Fi flow refactor

Dropped the procedural `icons.cpp` approach and reinstated PNG icons. The quality tradeoff wasn't worth the flash savings, so the budget got reframed instead.

New screens:

- `screen_wifi_scan.{h,cpp}` — list, scrollbar, loading state
- `screen_wifi_password.{h,cpp}` — qwerty + green tick CTA
- `screen_wifi_settings.{h,cpp}` — toggle, password masking, error modal
- `png_icons.{h,cpp}` — first cut of the canonical PNG loader

New `ui_primitives` additions:

- `draw_qwerty` / `hit_qwerty` (+ `KEY_*` codes)
- `draw_modal` / `hit_modal_ok`
- `draw_toggle` / `hit_toggle`
- `draw_password_field` / `hit_password_eye`
- `draw_network_row`
- `draw_scrollbar` / `hit_scrollbar`

Static review of the entire Step 4 wiring — render dispatch, touch dispatch, primitive coverage, and PNG asset audit.

## Hardware + integrations

- Began testing of the new prototype board for V2
- Planned NFC integration
- Researched potential Fiber integrations
