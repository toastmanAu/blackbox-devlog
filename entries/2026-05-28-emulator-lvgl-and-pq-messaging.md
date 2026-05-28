---
title: "Fortnightly #3: Board emulator, LVGL port, and a PQC messaging protocol"
date: 2026-05-28
tweet: "Fortnightly #3: open-source ESP32 + ST7789 board emulator to shrink the embedded debug loop, now porting BlackBox to LVGL on top of it. Also cemp-pq, a post-quantum messaging protocol for the backend. S3 prototype being fleshed out alongside."
summary: "Open-source ESP32 board emulator shrinks the embedded debug loop, BlackBox is being ported to LVGL on top of it, and a new post-quantum messaging protocol (cemp-pq) lands for the backend."
tags: ["wave-2", "tooling", "ui"]
version: "0.3.0-dev"
do_not_post: true
thread:
  - "Embedded tooling: built arduino-board-emulator — an ESP32 + TFT + touchscreen emulator targeting base ESP32 / ST7789 (BlackBox's current display). MVP is now usable. Fully open source: github.com/toastmanAu/arduino-board-emulator"
  - "Using the emulator to port BlackBox's display layer to LVGL, the industry-standard embedded GUI library — more flexibility, better UX, and a much shorter iteration loop than the previous custom driver. New LVGL build for testers in the coming days."
  - "Backend: cemp-pq, a post-quantum messaging protocol that unlocks new comms capabilities — github.com/toastmanAu/cemp-pq. Also pushed minor optimisations into ckb-light-client-lite, which will land in the upcoming ESP32-S3 prototype iteration."
---

A toolchain-heavy fortnight. Most of the work went into building the things that make future work faster: an emulator that closes the iteration loop, an LVGL port that opens it up, and a new backend protocol that unlocks a class of capabilities BlackBox couldn't reach before.

## Embedded tooling — arduino-board-emulator

Graphical iteration on embedded hardware has historically been laborious — flash, observe, tweak, repeat, with each loop measured in minutes. In an automated, agentic age, that pace is unacceptable. So I'm building an ESP32 + TFT + touchscreen emulator that runs as a desktop application.

MVP is now usable, targeting base ESP32 and the ST7789 display (the current BlackBox combination). Fully open source: [arduino-board-emulator](https://github.com/toastmanAu/arduino-board-emulator). Functionality will expand as required, starting with BlackBox peripherals.

The emulator shrinks the debug loop dramatically and makes the next stretch of work realistic.

## Graphical upgrade — LVGL port

Using the emulator, I'm porting BlackBox's display layer off the previous custom driver onto LVGL — the industry-standard embedded GUI library. The payoff is greater flexibility, a cleaner abstraction over the display, and a substantially better UX baseline.

A new LVGL build should be ready for testers in the coming days.

## Hardware — ESP32-S3 prototype

The next target board (ESP32-S3 based) is being fleshed out, with peripherals being integrated for the V2 prototype in parallel.

## Backend — cemp-pq + light-client-lite

On the backend protocol side: [cemp-pq](https://github.com/toastmanAu/cemp-pq), a post-quantum cryptographic messaging protocol that unlocks new communication capabilities for the device.

Minor optimisations have also landed in ckb-light-client-lite, which will be integrated into the upcoming S3 iteration.
