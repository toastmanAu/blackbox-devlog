---
title: "Fortnightly #8: v0.3.0 ships, and BlackBox moves to new silicon"
date: 2026-08-28
tweet: "Fortnightly #8: v0.3.0 shipped to the V1 prototype for testing — over the air, no cable. Then BlackBox moved to new silicon: the old board was at 99.7% of its app slot, the S3 port sits at 25% of one six times bigger. First unit soldered and loomed."
summary: "v0.3.0 goes out as a release the fielded prototype's own one-press updater collects, repartitioning its flash with no cable attached. Then the board changes: the V1 hardware sat at 99.7% of its application slot, so v1.0.0 forks to a VIEWE ESP32-S3 — 16 MB flash, 8 MB octal PSRAM, an ST7796 panel and a touch controller LovyanGFX gets wrong — landing at 25% of a slot six times larger and ending the per-commit flash-budget gate permanently. A dependency graph overturns the ESP-IDF migration the light client was supposed to require, vendor documentation proves wrong in two load-bearing places, three brick-class traps are written down before any wiring, headers and looms go on the bench, and the repo gets its first CI — which immediately finds the simulator had not built for two months."
tags: ["wave-2", "hardware", "firmware"]
version: "1.0.0-dev"
do_not_post: true
thread:
  - "v0.3.0 is out to the V1 prototype for bench testing, published as a release the fielded unit's own one-press auto-updater collects. A v0.2.6 device downloads it, repartitions its flash in place and comes up on the new layout — no cable, no serial port, one button."
  - "Why move boards: v0.3.0 filled 99.7% of the WROOM's 4MB app slot, so the on-device light client — the last open item of the two-tier arc — could not physically fit. v1.0.0 is a new tree on a VIEWE ESP32-S3: 16MB flash, 8MB octal PSRAM. The app now sits at 25%."
  - "A conclusion got overturned, which is the best kind. The old design said an ESP-IDF migration was required to host the light client. But the only two ckb-light-esp components with IDF coupling are the two we don't need; what's left is ~5,300 lines of portable C99."
  - "Vendor docs wrong twice, both load-bearing: no CH340 (it's native USB-Serial-JTAG), and the config claims ST7789 while the init sequence is ST7796. LovyanGFX's stock CHSC6540 touch driver is wrong too — it can't express a coordinate above 255 on a 320x480 panel."
  - "Then the bench: J3 and NFC headers soldered, custom looms built for the printer, QR scanner and NFC module. bb_pins.h holds every GPIO in the tree, so it's the one file you diff against the schematic. First power-up is in the coming days."
---

For most of this project the interesting work has been software finding its
way around hardware. This fortnight the software shipped, and then the
hardware moved.

## v0.3.0 goes out

The firmware the last several entries have been building — Tier-1 transport,
live pricing, on-chain confirmation, over-the-air updates — is now cut as a
release and running on the V1 prototype for bench testing.

The delivery is the part worth describing. A fielded v0.2.6 unit has no
cable attached and no serial port exposed, but it does have a one-press
auto-updater that fetches a specific filename from a GitHub release. So the
release publishes the *updater* under the name that old firmware expects for
application firmware. The unit downloads it believing it is a routine app
update, boots into it, and the updater then repartitions the flash in place
and comes up ready to receive v0.3.0 proper. A naming convention used as a
delivery channel, and the only reason the migration needs no hands on the
device.

That closes v0.3.0. The tree is now frozen — not abandoned, but finished for
the board it was written for.

## The ceiling

v0.3.0 has been running at 99.7% of the V1 board's application slot. Every
commit for months has passed a flash-budget check, and the on-device light
client — item #3, and the last open item of the two-tier transport arc — was
never going to fit in what was left. That was not a problem to optimise
around. It was a board problem.

So v1.0.0 is a new sketch tree on a new board: the VIEWE UEDX32480035E-WB-A,
an ESP32-S3 with 16 MB of flash and 8 MB of octal PSRAM, driving a 320x480
ST7796 over SPI with a CHSC6540 capacitive touch panel. v0.3.0 stays
flashable on V1 hardware for UI-feel testing, and the two trees are free to
diverge from here. The port compiles to 1,618,587 bytes against a 6 MB slot:
25%. The gate is gone permanently, and the entire microSD block stays
reserved for the light client's filter cache.

## The migration that turned out not to be needed

The two-tier design recorded that an Arduino-to-ESP-IDF convergence would be
required on any board that hosted the light client. That is now superseded,
and the thing that overturned it was a dependency graph rather than an
attempt. `ckb-light-esp` has six components; the only two carrying
ESP-IDF-specific coupling are its Wi-Fi and display layers, which are exactly
the two BlackBox does not need — `wifi_svc` and LovyanGFX already cover that
ground. What remains is roughly 5,300 lines of portable C99 whose only
external dependency is mbedTLS, which arduino-esp32 already ships and which
this project already links for TLS.

So: no framework migration, no rebuild of the LVGL integration, and the
simulator keeps working. A week of planned work deleted by reading the graph
before starting.

## What the schematic said, and the README didn't

The vendor documentation is wrong in two places and both are load-bearing.
Its USB section describes a CH340 that does not exist — the data lines reach
the S3 through ESD diodes only, so the board is native USB-Serial-JTAG and
enumerates as `ttyACM`, not `ttyUSB`. And the board config declares an ST7789
while its own initialisation sequence is unmistakably ST7796: it opens with
the command-set unlock that the ST7789 does not have.

The stock touch driver is wrong too. LovyanGFX ships a CHSC6X driver, but
against the real CHSC6540 protocol it reads the touch-point count as the X
coordinate, the X low byte as Y, and discards both high nibbles — it cannot
express any coordinate above 255 on a 320x480 panel. v1.0.0 carries a
replacement with a host-tested coordinate decode.

Three more traps are now written into the checkpoint rather than waiting to
be discovered with a meter in hand. The panel's interface-mode straps are
software-selected, not resistor-strapped, and must be driven high before any
SPI traffic or the display comes up lit and blank with no error anywhere.
The bootloader offset is 0x0 rather than 0x1000, so copying the old flash
script unchanged produces a board that never boots and says nothing about
why. And this PSRAM is octal — the quad setting that worked on the old board
silently yields zero bytes.

One real bug fell out of the port. The scanner's baud bootstrap opened at
9600, sent the set-baud frame, and reopened at 115200 without ever confirming
the scanner had answered. After a warm reset the scanner is usually already
at 115200, so the frame lands as garbage, the reopen "succeeds", and the
scanner is dead for that entire boot with nothing in the log. It is now
ACK-verified with a retry. Same failure class as the indexer cursor poison
earlier in this project's history: green everywhere, feature silently absent.

## Headers and looms

The rest of the fortnight was on the bench. J3 headers went onto the VIEWE
board, headers onto the NFC reader, and custom wiring looms were made up for
the printer, the QR scanner and the NFC module — each one a conversion rather
than a cable, since none of the three peripherals arrives speaking the
board's connector.

The pin allocation is tight in a satisfying way: the board has exactly eight
genuinely free GPIOs, all on one header, and the three added peripherals fit
in exactly eight. Every one of them lives in `bb_pins.h`, which is the single
source of truth for every GPIO in the tree — no pin literal survives anywhere
else. That makes it the one file to diff against the schematic, and it makes
the eventual ESP32-P4 port a one-file change.

Nothing has been powered up yet. That is the coming days.

## First CI, and what it found

This repo had no continuous integration at all. It now has three independent
jobs: the host test suites, both device builds, and a headless simulator
render gate. The build job runs through the flash scripts themselves rather
than open-coding the toolchain, so the scripts are under test too.

The simulator gate justified itself immediately by revealing that the
simulator had not built this sketch for about two months — since the CODE128
barcode work landed — because the emulator's bundled LVGL lacked a function
it now calls. Nothing ran it, so nobody found out, and the committed golden
screenshots quietly stopped being updated. The gate deliberately does not
pixel-diff against those goldens: a golden gate goes red on every intended
redesign, so it gets ignored, and an ignored gate is worse than none. It
asserts the sketch still renders a live frame, which is the thing that
actually broke.

The pre-hardware review found eight items, the best of which was that the new
flash script had no target for the asset image at all — and the asset loader
formats and mounts an empty partition on failure without complaining. That
would have presented as a display fault on a perfectly good display.

Next: power on, and the Phase 1 checkpoint — display, touch, printer and
scanner, with the rotation, baud and print-heat values measured and written
down. Then Phase 2, and the light client finally runs on the device.
