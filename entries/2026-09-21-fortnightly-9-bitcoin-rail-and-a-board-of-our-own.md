---
title: "Fortnightly #9: Bitcoin becomes a second rail, and BlackBox gets a board of its own"
date: 2026-09-21
tweet: "Fortnightly #9: the new S3 board powered up and talked to the chain. Bitcoin is now a second receive rail — watch-only from an xpub, no key on the device, and a payment only reads VERIFIED once the terminal checks the Merkle proof itself."
summary: "The VIEWE S3 board comes up and resolves a real funding block against the testnet indexer; the light client gets an explicit answer to where its scan starts, with no silent defaults. Bitcoin lands as a second receive rail — receive-only, keyless, watch-only from a merchant xpub, with SEEN and VERIFIED as separate states and VERIFIED meaning a Merkle proof checked against a header chain the terminal validated itself. And a custom 4-layer PCB now exists in KiCad, generated from a source model rather than drawn, with six blockers still open before anything goes to fab."
tags: ["wave-2", "hardware", "firmware"]
version: "1.0.0-dev"
do_not_post: true
thread:
  - "The board is alive. The VIEWE S3 came up, associated, and talked to the testnet indexer — and returned the correct funding block for a merchant address, 5,411,713, a value queried from the indexer before flashing so the device was checked against a prediction rather than read for whatever it produced."
  - "Where does a light client start scanning? Guessing costs either hours of sync or invisible missing funds. So the answer is now explicit: a resolution ladder, a three-way start screen, and no silent default anywhere — backing out without choosing commits nothing."
  - "Bitcoin is now a second receive rail. Receive-only, no secret on the device: the merchant scans their own wallet's xpub, and every sale derives a fresh BIP84 address from it. The terminal can watch for money it cannot spend."
  - "SEEN and VERIFIED are different states and the difference is the point. SEEN is the Electrum server saying so. VERIFIED is a Merkle proof checked against a header chain the terminal validated itself from a baked signet checkpoint. The server can help it look; it cannot make it believe."
  - "And BlackBox now has a board of its own — 4 layers, 125 nets, ERC clean — generated from a source model rather than drawn, so every frozen pin allocation is re-proven on each build. Six blockers still open. Not for fab."
---

Three things this fortnight, and they sit at three different distances from
the customer: the new board came alive, the terminal learned to take Bitcoin,
and a board designed for this product — rather than bought and adapted —
exists for the first time.

## The board is alive

Last entry ended with headers soldered and nothing powered up. It is powered
up. The VIEWE S3 boots, renders, takes touch, associates, and talks to the
testnet indexer on `.134`.

The first real thing it did was resolve a merchant address to its funding
block: **5,411,713**. That number was queried from the indexer *before*
flashing, so the device was checked against a prediction rather than read for
whatever it happened to produce — the difference between a test and a
demonstration. Three of the thirteen light-client bootstrap checkpoint items
are now ticked, and the method caveat is written down beside them: the
scanner was not yet wired, so the address and token were seeded by a
temporary uncommitted patch. Every ticked item gets re-run through real
scanning before it counts for shipping.

The printer was brought up the same way round. Its baud was read off its own
self-test print — power the head on the bench supply, hold FEED, read the
configuration off the paper — rather than bisected by flashing one value and
then another. It reported 9600, which is already the shipped constant, so
nothing changed. What that gesture actually bought was proof of supply, head
and paper before firmware was in the loop at all, because the printer has no
presence detection whatsoever: the driver opens the UART, sets the heat
config and declares itself ready without ever reading a byte back. A wrong
baud looks exactly like bad wiring, a brownout, an empty roll or a dead head.

The scanner needed a code change. The bootstrap proves a GM861S by command
and ACK, and the head currently on the bench answers neither handshake — so
it was marked absent and scanning was simply dead, despite the fact that it
streams every decoded code as plain text at 9600 anyway. The two handshakes
now decide a drive mode instead of a present/absent verdict: no ACK reopens
the UART at 9600 in listen-only mode, sends the head nothing, and lets the
existing poll read the text. Same wiring for both heads, and the GM861S takes
the command path unchanged when it is fitted.

## Where the scan starts

A light client has to be told where to begin, and both wrong answers are bad.
Too low and it syncs for hours it does not need. Too high and it never sees
the funds — and reports itself perfectly healthy while doing so, which is the
worse of the two by a distance.

So the start height is now an explicit, provenance-tracked value rather than
a default. A resolution ladder takes it from the provisioning bundle if it
carries one; otherwise a three-way screen appears exactly once per boot, with
a repair mode for a merchant who needs to change it later. "Look it up" asks
the indexer for the address's first transaction. A hand-typed height is
validated asymmetrically — above the tip is refused outright, just under it
warns — because those two mistakes have different costs. Backing out without
choosing commits nothing, and a lookup that fails sets no height rather than
falling back to zero. A balance cross-check chip watches for a sustained
shortfall, which is what a too-high start height looks like from the outside.

## Bitcoin, receive-only

The larger piece of work is a second payment rail.

The posture is the one this project already has for CKB: **no secret on the
device**. The merchant scans their own Bitcoin wallet's account xpub with the
same gesture they use for an address today, and each sale derives a fresh
BIP84 P2WPKH receive address from it and shows it as a BIP21 QR. The terminal
can watch for money it has no ability to spend.

The part worth the effort is what counts as payment. There are two states,
and they are deliberately not the same. **SEEN** means the payment appeared
unconfirmed — the Electrum server said so, and it is labelled as not final.
**VERIFIED** means the terminal took a Merkle proof for the transaction and
checked it against a block header it validated itself, from a checkpoint
baked into firmware at a retarget boundary, upward through proof of work,
linkage, retarget and median-time rules. An Electrum server can help the
terminal find a payment. It cannot make the terminal believe in one that did
not happen.

Underneath that: BIP32 public derivation over the one EC operation it needs,
bech32 addresses sharing their core with the CKB decoder already in the tree,
a streaming transaction parser bounded so an oversized stream cannot run the
device out of memory, a validated header ring in PSRAM holding two retarget
periods, fork choice by accumulated work, a persisted window that discards
itself if it no longer descends from the anchor, and an Electrum client with
bounded framing. Crypto is mbedTLS on both host and device — the same
implementation the host suite tests — with only RIPEMD-160 vendored, because
the device's mbedTLS ships the header without the symbols. Sixteen host test
suites, against real mainnet and signet vectors rather than invented ones.

It is behind a compile-time flag, default off, and it runs on signet until
the signet hardware checkpoint passes. Signet's proof of work is trivial, so
signet proves the plumbing and explicitly not the security margin. The
checkpoint's provenance — fetched, cross-checked against a second source, and
re-verified in Python before commit — is recorded in the repo, because
everything VERIFIED rests on it.

Ahead of all of it, a diagnostics pass: a sampler task, a live task registry,
an exit table, and baseline numbers taken before a second chain starts
contending for internal DRAM. Measuring first is cheap and only possible
once.

## A board of our own

Separately, on the bench machine, BlackBox now has a PCB designed for it.

It is a cost-optimised sibling to the terminal rather than a replacement for
the dev board: an ESP32-S3-WROOM-1U-N16R8 driving a 5-inch 800x480 landscape
RGB panel, 4 layers, 9 V in through a protected eFuse, one 3.3 V rail, no 5 V
system rail at all, with the printer, scanner, NFC reader and microSD this
project already uses. 193 footprints, 125 nets, ERC clean, and routed.

The method matters more than the board. The design is **generated from a
source model** — parts and nets in two Python files — and the schematic, the
PCB, the BOM, the placement file, the pinout doc and the firmware's pin
header all fall out of it. That turns "use the frozen pin map exactly" from
an instruction into something re-proven on every build: a checker re-validates
all 40 LCD FPC pins, the touch pins, the expander allocation, the two
separate I2C buses and every safe-boot default against the frozen handoff,
and a second checker confirms KiCad's own netlist extraction agrees with the
model at both the schematic and the board end.

Which is how several errors were caught before copper. A level translator's
pinout was wrong on all five signals and was corrected against the datasheet.
An estimated footprint for the eFuse shorted two pads, and DRC found it; the
replacement was extracted from the vector drawing in the datasheet and scaled
by its own stated factor. The printer's inrush was calculated at 200 A into
its bulk capacitance, fixed with a gate-to-drain Miller capacitor that turns
a 45 microsecond step into a 6.6 millisecond ramp at 1.4 A. The input
over-voltage trip is set by the printer's 9 V limit rather than the eFuse's
23 V capability, so a mis-plugged 12 V adapter is disconnected instead of
passed through. And the backlight's dimming protocol turned out to be
impossible over the I/O expander — its bit times are microseconds and every
expander write is a whole I2C transaction — so Rev A is fixed current with a
hard on/off that guarantees the panel is dark at reset rather than flashing
white before there is a framebuffer.

It is **not for fab**. Six blockers remain and most collapse into two
purchases: buy an exact panel, and put a scope on the printer during a dense
print. One of them is already half-answered by the bench work above — the
printer's default baud, read off its own paper.

## Next

Re-run the light-client bootstrap checks through a real scan once the GM861S
is fitted, then the rest of the Phase 1 checkpoint. On the Bitcoin side,
detection and the sale path — the confirmation machine, the write-ahead sale
record, and the QR, success and receipt branches — and then the signet
hardware checkpoint, which is the first time a Bitcoin payment is taken on
the device. And on the board: a panel to measure against.
