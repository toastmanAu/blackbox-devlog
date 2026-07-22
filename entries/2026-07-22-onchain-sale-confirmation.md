---
title: "Fortnightly #6: BlackBox confirms its own sales on-chain"
date: 2026-07-22
tweet: "Fortnightly #6: BlackBox now confirms sales on-chain by itself — the V2 prototype watches a CKB indexer directly instead of trusting the payment proxy, auto-advances to Success and prints a receipt. Plus scanner, printer, refunds and sweep."
summary: "The V2 prototype's payment path graduates from a Wi-Fi stand-in to real on-chain confirmation, passing its hardware checkpoint with two auto-detected sales and a printed receipt. Scanner and thermal printer come up on real UARTs, and the POS gains a keyless merchant wallet with refunds and cold-storage sweep."
tags: ["wave-2", "firmware", "hardware"]
version: "0.3.0-dev"
do_not_post: true
thread:
  - "Wave 7b brought the peripherals up on real hardware: a GM861S barcode scanner on UART2 (with its 9600 to 115200 bootstrap) wired into the sale flow, and a QR204 thermal printer on UART1 producing an actual receipt with line items, totals and an NTP-synced date."
  - "Wave 8 removed the Wi-Fi payment proxy. The device decodes a bech32m merchant address to a lock script itself, then polls get_cells_capacity on a CKB indexer from a background FreeRTOS task, auto-advancing to Success when capacity rises by the sale amount."
  - "Review caught two concurrency bugs on the money path before hardware: a dual-task race that could leak a task and report a false CONFIRMED, and a TOCTOU between the generation check and the state write. Fixed with a generation counter, per-task context and a critical section."
  - "Waves 9a and 9b made the POS a keyless spender. It holds only a scoped biscuit token, QR-provisioned from the Vault wallet, and submits intents to a relay the phone re-validates and signs. That buys refunds, a takings balance, and a sweep to a cold address."
---

The V2 prototype has been taking test payments for a while now — but the
payment *screen* was working off a stand-in. If the customer's phone reached
the device over Wi-Fi, the sale was treated as paid; the actual settlement was
verified out-of-band. This fortnight that placeholder came out, and the device
started confirming sales against the chain itself. The two payments below are
the first proofs of the new path, not the first payments.

## Wave 7b — the peripherals come up

The two UART peripherals that make a point-of-sale device a point-of-sale
device are alive on real hardware. A **GM861S barcode scanner** runs on UART2
behind a non-blocking driver (v0.2.6 init sequence, 9600 → 115200 bootstrap,
ACK-strip and idle-gap framing), wired into the sale flow so scanning a product
looks it up in `inventory_svc` and drops it straight into the cart. A **QR204
thermal printer** on UART1 prints a real receipt — line items, totals, a
`nervos:` payment URI and a live date line from a new SNTP `clock_svc`.

Several fixes only a bench session could have found. On-screen QR and barcodes
were being rendered inverted, which decoders reject outright — they needed
black-on-white with proper quiet zones. The indexed canvases were triggering a
~130 KB-per-frame decode allocation behind an intermittent QR failure, fixed by
flattening to RGB565. The device Wi-Fi build turned out to be compiling the
*simulator* branch, because an `__has_include` seam defeated library discovery;
the real stack costs another 614 KB and needed a 2.5 MB app partition. And the
payment URI scheme was corrected to the one JoyID actually implements.

## Wave 8 — on-chain confirmation

The proxy's replacement is three pieces. `ckb_addr` decodes a bech32m address
to a lock script on-device, host-tested with round-trip vectors. `chain_svc`
speaks `get_cells_capacity` JSON-RPC to a CKB indexer node. `confirm_svc` runs
a FreeRTOS poll task that arms when the QR screen appears and auto-advances to
Success when the merchant lock's capacity rises by the sale amount.

The interesting work was concurrency, not RPC. Review caught a dual-task race
in the poll design that could leak a task and produce a **false CONFIRMED** —
unacceptable on a money path — fixed with a generation counter and per-task
context, plus a critical section closing a TOCTOU between the generation check
and the state write. Disarming no longer blocks LVGL either.

Then the checkpoint: **two payments auto-detected on real hardware, with a
receipt printed.** The confirming transaction hash is now captured at CONFIRMED
and shown on the success screen and receipt — the first step toward per-tx
matching. Getting there also meant standing up chain infrastructure: an
OrangePi-3B testnet indexer node, bootstrapped from an existing RocksDB rather
than syncing from genesis, since the old node was decommissioned.

## Waves 9a & 9b — a keyless merchant wallet

A merchant needs to send, not just receive: refunds, and moving takings
somewhere safer than the till. But a shop-floor device should never hold a key.

The answer is the **Agent Gateway** from the [Vault companion
wallet](https://github.com/toastmanAu/wyltek-wallet). The POS holds only a
scoped biscuit token, provisioned by scanning a QR bundle the wallet now emits,
and submits `send_ckb` intents to the relay over TLS. The phone re-validates
against policy and signs. Wave 9a built that path plus a **Refund** flow and a
result screen; Wave 9b added an async **takings balance** for the merchant lock
and a **Sweep** screen that moves CKB to a persisted cold-storage address.

Review earned its keep again — corrupt-token parsing, a wrong-payee hazard from
a stale scanned recipient, a send-path mux gap, and a provisioning bundle
silently truncated by a 200-byte scan buffer (the biscuit bundles run 700–1000
chars) were all caught before hardware. The build sits at **61% flash / 34%
RAM**.
