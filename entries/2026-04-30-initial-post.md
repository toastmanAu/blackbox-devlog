---
title: "Fortnightly #1: UI primitives and the open-source backend stack"
date: 2026-04-30
tweet: "Opening a fortnightly BlackBox devlog. UI redesign hit primitives, fonts, 23 code-drawn icons, home + settings screens. 8 weeks of backend protocol work also now open source — Fiber x402 micropayments, JoyID embedded auth, seed gen, light client."
summary: "First fortnightly entry. UI redesign steps 1–3 of PLAN.md complete; eight weeks of backend protocol design surfaced as open-source repos; new hardware components unlock NFC and integrated light client paths."
tags: ["wave-2", "ui", "fiber", "joyid", "open-source"]
version: "0.3.0-dev"
do_not_post: true
thread:
  - "Primitives layer keeps the V2 ESP32-P4 port cheap: theme.h holds layout constants, fonts.{h,cpp} wires FamiljenGrotesk, icons.{h,cpp} renders 23 icons in code (no bitmap atlas), ui_primitives.{h,cpp} holds shared draw helpers."
  - "Open-source backend repos backing BlackBox: wyEspAgentPay (Fiber x402 for ESP32), WyAuth (JoyID P-256 on-device), joyid-ckb-connector (mobile-first relay), wyseed (BIP39/32 + embedded C), ckb-light-client-lite (musl SQLite builds), WyVault (ESP32-P4 wallet)."
  - "Hardware research lined up the V2 spec — new components unlock NFC and integrated light client functionality. Same ESP32-P4 chip as WyVault, so theme.h constants and the bring-up patterns port across cleanly."
---

It's been a while since I've posted any BlackBox updates. Starting now (this is entry 1) I'll be making a fortnightly blog post detailing BlackBox progress specifically. The last couple of months have been productive on a variety of fronts. I'm currently implementing the UI suggestions from the initial phase of BlackBox prototypes and expect a usable update in the next couple of weeks. The next iteration of BlackBox will bring both native L1 CKB transactions and Fiber transactions into the fold, alongside other integrations.

This entry covers the highlights: the last week of UI work, and the last eight weeks of protocol design. Further research has also been made on potential production-run hardware, with several new components landing that unlock the next stage of integrations — including NFC and integrated light client functionality.

## UI redesign — Steps 1–3 of PLAN.md done

**Primitives layer** (new files in the sketch):

- `theme.h` — layout constants (kept central so the V2 ESP32-P4 port is cheap)
- `fonts.{h,cpp}` — FamiljenGrotesk wired in (no swap)
- `icons.{h,cpp}` — 23 code-drawn icons
- `ui_primitives.{h,cpp}` — shared draw helpers

**Screens built:**

- Home → `screen_home.{h,cpp}`
- Settings → `screen_settings.{h,cpp}`

**Python preview mirrors** for fast desktop iteration:

- `render_gallery.py`, `render_home.py`, `render_settings.py` → all save `*_preview.png`
- `render_home.py` and `render_settings.py` import primitives from `render_gallery.py` (a `preview_lib` refactor is deferred until rule-of-three triggers)

**Sketch integration:**

- Gallery wired into `ckb_pos_v0.2.6.ino` via a TEMP block — not yet visually verified on device (hardware unplugged)
- Icon size bumps applied: footer 32px, status 20px, gallery 32px

**Flash savings:**

- Logo de-dup: `LOGO_JOINER` → `/bbLogo.png` SPIFFS route → ~20 KB program flash freed

## Backend protocol design — open-source repositories

The last eight weeks of protocol work has surfaced as a set of public repos. Each one fills a specific hole in the BlackBox stack:

- **wyEspAgentPay** (ESP-IDF, Makefile) — x402 Fiber micropayment library for ESP32. The literal library BlackBox will call when a customer taps "Pay". No equivalent exists elsewhere; this is custom-built.
- **fiber-installer** (Python) — one-command Fiber node bootstrap for Linux, macOS, and Windows. Useful for the kiosk-side or merchant-laptop Fiber node that BlackBox routes through.
- **WyAuth** (C++) — JoyID embedded auth for ESP32: P-256 verification via mbedTLS plus a Cloudflare Worker callback receiver. The on-device half of "tap to sign on BlackBox".
- **joyid-ckb-connector** (TS) — mobile-first JoyID connector with a CF Worker relay (bypasses Chrome's WebAuthn hybrid transport). The web/relay half that pairs with WyAuth; the same relay pattern carried lessons documented in `ckb-transactions.feedback.md` §1 and the witness-pad gaps.
- **joyid-sdk-js** (TS) — JoyID JS SDK fork; backstop reference if `@joyid/ckb` upstream drifts.
- **wyseed** (Python + embedded C) — BIP39/BIP32 seed generation with an embedded C library explicitly targeting ESP32/RP2040. The link target if a merchant does a first-run "create new wallet" instead of pairing JoyID.
- **ckb-light-client-lite** — static musl SQLite light client builds. The natural backend for pairing BlackBox with a small Linux box (Pi/N100) to watch for incoming payments without a full node.
- **WyVault** — ESP32-P4 CKB hardware wallet, Ledger bridge, Quantum Purse support. Same chip as BlackBox V2; pinmap, display init, USB stack, and signing pipeline are the closest prior art for V2 — the repo to diff against when porting `theme.h` constants to P4.
- **wyvault-lite** (C) — ESP32-S3 hardware wallet. Sibling architecture; useful for small-screen UI primitives if a BlackBox Mini ever happens.
