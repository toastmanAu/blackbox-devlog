---
title: "Fortnightly #5: The POS app comes alive on LVGL"
date: 2026-06-30
tweet: "Fortnightly #5: BlackBox's POS app came alive on LVGL — payments, QR, inventory CRUD and a sales cart/invoice flow on a new ILI9488 target. The Vault wallet gained an on-chain Agent Gateway and on-device light client; the emulator went agentic with a LAN mirror."
summary: "BlackBox's on-device POS app takes shape on LVGL — payments, QR, full inventory CRUD and a sales cart/invoice flow on a new ILI9488 display target; the Vault companion wallet adds an on-chain Agent Gateway and embedded light client, and the board emulator goes agentic."
tags: ["wave-2", "firmware", "ui"]
version: "0.3.0-dev"
do_not_post: true
thread:
  - "BlackBox POS — the device app. Five waves landed on LVGL: Wi-Fi + QR payment outcomes (lv_qrcode), asset/address screens, full inventory CRUD with CODE128 barcodes (lv_barcode), and a sales cart → invoice → checkout flow. Sitting at ~62% flash / 25% RAM."
  - "New display target: an ILI9488 board profile at the same 320x480 portrait geometry, swapping the controller from the ST7789. Each screen is built against Figma references and verified in the emulator before any hardware flash — a Wave 6+7a hardware-checkpoint runbook captures the on-bench plan."
  - "BlackBox Vault (companion wallet) gained an Agent Gateway — biscuit-token authz, a Ktor server, biometric approval, and a keyless relay — now proven on-chain on Pudge testnet. Auto-allow under cap, need-approval over it, deny on replay/over-cap, all correct."
  - "Vault also embeds ckb-light-client on-device now: an Android arm64 build runs as a foreground service serving get_cells, with a tip-lag state classifier. And the emulator went agentic — a LAN mirror (MJPEG + audio + touch injection) lets an agent see and drive the screen."
---

A heavy fortnight, and a return to the bench. Where #4 was a remote stretch that paused hands-on device work, this time the POS application itself made the most progress — going from an LVGL display-layer port to a genuinely usable point-of-sale app.

## BlackBox POS — the app comes alive on LVGL

The LVGL port stopped being a port and became the product. Five waves of screens landed, each built against its Figma reference and wired into a backing service:

- **Payments & outcomes** — the pay flow now drives a real QR code (`lv_qrcode`) through to dedicated *Payment Successful* and *Payment Not Complete* screens, on top of the async Wi-Fi flow from earlier waves.
- **Assets & addresses** — a Choose-Asset list and per-asset receive addresses, with a CKB-only URI invariant enforced in `pay_svc`.
- **Inventory CRUD** — a full view *and* write path: browse a scrollable product list, open item detail with a CODE128 barcode (`lv_barcode`), add items through an inline form, and delete them. Backed by an in-RAM `inventory_svc`.
- **Sales** — a cart/invoice flow: tap inventory to add line items, review a full-cart `lv_table` with per-row delete, and check out straight into the shared QR path.

All of this sits at roughly **62% flash / 25% RAM** — comfortable headroom for the scanner and printer paths still queued behind the next hardware checkpoint.

## Hardware — a new ILI9488 target

BlackBox is moving onto an **ILI9488** display controller, keeping the same 320×480 portrait geometry as the ST7789 the earlier prototypes used. A new board profile for it landed in the emulator first, so the whole POS app could be exercised against the real target before committing to a flash. A Wave 6+7a hardware-checkpoint runbook captures the on-bench validation plan.

## Companion wallet — Agent Gateway + on-device light client

[BlackBox Vault](https://github.com/toastmanAu/wyltek-wallet) grew two substantial capabilities. The first is an **Agent Gateway**: a way for an autonomous agent to request spends from the wallet under policy. It pairs biscuit-token authorisation, a Ktor server hosted in a foreground service, a biometric approval screen, and a keyless relay for wake — and it's proven on-chain on the Pudge testnet. Auto-allow under a per-token cap, need-approval over it, and deny on replay or over-cap all behave correctly against a real on-chain ledger.

The second is an **embedded light client**: an Android arm64 build of `ckb-light-client` now runs on-device as a foreground service, serving `get_cells` directly to the wallet with a tip-lag state classifier driving sync UI. The wallet no longer leans on a remote node to see its own chain state.

## Embedded tooling — the emulator goes agentic

The [board emulator](https://github.com/toastmanAu/arduino-board-emulator) closed its agentic loop. A new **LAN mirror** streams the emulated display (MJPEG + `screen.png`), taps the audio output, and accepts **touch injection** over HTTP — so an agent (or a remote tester) can both *see* and *drive* the screen, discoverable over mDNS with a one-toggle Tauri switch. ArduinoOTA and an AsyncWebServer/SSE shim also landed, rounding out the peripherals BlackBox's firmware expects. The debug loop keeps shrinking.
