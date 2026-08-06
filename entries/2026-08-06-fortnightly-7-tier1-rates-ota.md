---
title: "Fortnightly #7: no third machine, pricing returns, and updates over the air"
date: 2026-08-06
tweet: "Fortnightly #7: BlackBox cut its last server dependency — the POS now signs and confirms through the merchant's phone alone. The LVGL rewrite got live pricing back (hardened this time), and OTA updates can migrate old units with no cable."
summary: "The Tier-1 arc lands: a V1 device needs nothing but the companion wallet app — signing over LAN mDNS/TLS, chain reads proxied through the phone, hardware-verified end-to-end. Live pricing returns to the rewrite with a hardened Binance+FX rate chain and six currencies, a review catch saves half of all sales from never confirming, and a permanent updater partition brings browser OTA plus a no-cable migration path for v0.2.6 units."
tags: ["wave-2", "firmware", "hardware"]
version: "0.3.0-dev"
do_not_post: true
thread:
  - "The two-tier transport arc closed: provisioning, sales with on-chain confirmation, balance, refunds and sweep all run with zero infrastructure beyond the phone. The phone serves the relay's own wire contract over self-signed TLS, advertised by mDNS — the relay and indexer become an opt-in tier."
  - "The rewrite caught back up to the old prototype's live pricing, and hardened it: Binance CKBUSDT crossed with a daily FX table as primary, CoinGecko backup with 429 backoff, six currencies, and a stale-rate gate that refuses to quote when the feed dies instead of guessing."
  - "Best catch of the fortnight: the QR amount rounded to 2 decimals but confirmation waited for full-precision shannons — at any real rate, about half of paid sales would never confirm. Found in whole-branch review, fixed by quantizing the quote once at strike so QR, chain watch and receipt all agree exactly."
  - "And OTA: a permanent 1MB updater partition serves browser upload for firmware and assets, with bootloader fallback if an upload is corrupt. Old v0.2.6 units migrate over the air — the updater delivered through their existing web-OTA repartitions the flash in place. Review killed four brick vectors before hardware ever saw it."
---

The last fortnight closed out three arcs that each would have headlined a
quieter cycle: the device lost its last server dependency, got its live
prices back, and learned to update itself.

## No third machine

The two-tier transport work finished and passed its hardware checkpoint: a
Tier-1 device pairs with the merchant's phone by QR, resolves it over mDNS,
and does everything through it — refund and sweep signing via the relay wire
contract served locally over self-signed TLS, and sale confirmation plus
balance through a chain-read proxy on the phone. No relay, no indexer, no
Tailscale. Six device-only bugs fell out of the live checkpoint (the Android
HTTP server that couldn't actually serve HTTPS was the best of them), the
board's forgotten 4 MB of PSRAM got switched on, and receipts picked up the
BlackBox logo — after a detour through the QR204's raster quirks — plus a
printed refund receipt.

## Pricing returns, hardened

The original prototype always priced sales live; the LVGL rewrite had been
running on a hardcoded stub since the port began. That gap closed this
fortnight, with more armour than before: a background task feeds the POS
from Binance's CKB ticker crossed with a daily USD→fiat table, falling back
to CoinGecko with exponential backoff when rate-limited. Merchants pick from
six display currencies, quotes lock their rate the moment they're struck,
and a stale feed blocks new quotes rather than guessing — tapping checkout
kicks an immediate refetch. The fortnight's best save came from review, not
hardware: the payment QR rounded CKB to two decimals while the chain watcher
demanded full precision, so at any real rate roughly half of paid sales
would have sat unconfirmed forever. One quantization at quote-strike now
keeps the QR, the watcher and the receipt in exact agreement.

## Updates over the air

v0.3.0 ships with a permanent factory updater partition: tap Update in
Settings, the device reboots into a 1 MB updater that joins Wi-Fi (or opens
its own AP), and a browser on the LAN uploads new firmware and assets — with
the bootloader falling back to the updater if an upload is bad. Fielded
v0.2.6 units get there with no cable: their existing web-OTA delivers the
updater, which repartitions the flash in place and comes up ready to receive
v0.3.0. The review process earned its keep here — four distinct brick vectors
(a cross-core cache race during the table write among them) were caught and
fixed before any hardware was risked.

Next: the hardware checkpoint for OTA and migration, golden-image recaptures,
and then the long-promised Fiber instant-settlement path.
