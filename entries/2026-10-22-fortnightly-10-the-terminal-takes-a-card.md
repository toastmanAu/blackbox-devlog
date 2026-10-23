---
title: "Fortnightly #10: the terminal learns to take a card"
date: 2026-10-22
tweet: "Fortnightly #10: BlackBox now takes a prepaid card. The balance lives on the card and is debited on the tap itself — no network, no chain tx per sale — then the terminal settles the day's taps to the Vault on-chain in a batch. Demo tier works end to end."
summary: "A third way to pay lands: prepaid NFC cards that carry their own balance, debited card-side on the tap with the network unplugged, then batched to the Vault which settles them on chain. The money path is built to get a tap wrong safely — every debit is journaled before the card is written, and 'landed', 'didn't land' and 'unknown' are told apart. Alongside: item vouchers backed by tiny chain cells, staff keys authenticated by a tag's NXP originality signature, barcode scan-to-enter in inventory, and a UI freeze traced to a flash write on the wrong CPU core."
tags: ["wave-2", "firmware", "hardware"]
version: "1.0.0-dev"
do_not_post: true
thread:
  - "The third way to pay. CKB and Bitcoin both need the chain in the loop at the moment of sale. A prepaid card doesn't: the balance is on the card, the debit is a signed write back to the card, and the tap completes with the network unplugged. The chain only shows up later, in a batch."
  - "The interesting part is getting a tap wrong safely. Every debit is journaled before the card is written, so a card yanked mid-write is never charged twice or silently charged once — the terminal tells 'landed', 'didn't land' and 'unknown' apart, and resolves the unknown on the next tap of that card."
  - "The card is MAC-protected under a key the terminal holds but cannot mint: it can debit, not issue. The Vault issues cards and settles taps, spending one reserve cell per card and recording the batch on chain. One testnet settle closed the loop end to end: tap → journal → sync → on-chain."
  - "Alongside the cards: item vouchers — '1 × coffee' written to a tag, backed by a tiny chain cell — and staff keys, any genuine NXP tag identified by its originality signature. A counterfeit tag can't forge that signature, which is exactly the point of using it to gate an override."
  - "And a war story. A debit immediately followed by a sync froze the screen solid. A flash write running on the wrong CPU core stalled the core the UI lives on and dropped its clock tick. Pin the flash writers to the UI's core and it runs for days. No logic changed — only which core."
---

Three ways to pay now, and the newest one is the first that doesn't need the
chain at the moment of sale. CKB and Bitcoin both put the network in the loop
when the customer taps. A prepaid card takes it out: the money is on the card,
the debit happens on the card, and the terminal reconciles with the chain
afterwards, in its own time.

## A card that carries its own balance

The card holds a balance, a counter and a MAC. A tap reads the record, decides
whether the sale is allowed, writes the new balance and counter back, and signs
the result — all card-side, with no server and no transaction. The terminal
holds a debit key that can *spend down* a card but cannot *create* value: issuing
and loading happen in the Vault, which owns the on-chain reserve behind each
card. The posture is the one this project keeps for every rail — **the terminal
holds no key that can mint money**.

Settlement is a separate, later act. The terminal keeps a journal of every
completed tap and, when it can reach the Vault, sends the batch; the Vault
verifies each entry, spends the matching reserve cell, and records the result on
chain. Until then the terminal runs on an unsettled cap, so the worst case of a
terminal that never phones home is bounded rather than open-ended.

This is a *demo tier*. It runs on cheap NTAG cards protected by our own MAC
rather than the DESFire EV3 secure element the shipping card will use, behind a
compile-time flag, on testnet. It exists so the whole flow — issue, tap, debit,
refund, settle, revoke — is real and exercised long before the secure silicon
and its keys arrive.

## Getting a tap wrong, safely

The part worth the month is what happens when a tap *doesn't* go cleanly, because
that is where money is lost or duplicated.

Every debit is written to the journal as a write-ahead intent **before** the
card is touched, and removed only once the card write is confirmed and the entry
durably stored. So a card pulled out mid-write, a brown-out between the card and
the journal, a reader glitch — each lands in a state the terminal can name.
A write that is *known* not to have landed charges nothing. A write whose outcome
is *unknown* parks, and the next tap of that same card resolves it to exactly one
charge or none — never two. At the bench, cards were yanked mid-write on purpose,
five times, and the ledger came out with exactly five charges and no doubles and
no losses.

A sale cancelled at the instant its card was being charged is the nastiest case:
the money moved but the sale is gone. That now raises a flag the cashier must
acknowledge, and — a fix from the pre-merge security review — the same card is
refused a second tap until they do, so an orphaned charge is handed back by
refund rather than silently doubled. The guard is held until the operator clears
it, not on a timer, because a timer is exactly long enough for an unhurried
cashier to charge twice.

## Vouchers, and a key you can hold

Two companions to the card, both on the Vault side.

**Item vouchers** put a product rather than a balance on a tag — "1 × coffee" —
each backed by a minimum-size chain cell and settled through the same endpoint as
a card tap; a used-up voucher closes its cell automatically once the settlement
lands. **Staff keys** are the authorisation side: any genuine NXP NTAG21x,
recognised by the originality signature NXP puts on its silicon and verified once
with a hand-written, verify-only elliptic-curve check. A price override needs a
staff tag. The cheap demo cards turned out to be counterfeit — they answer like
the real part but cannot produce that signature — which breaks nothing for cards
(our MAC protects those) and is precisely why staff keys lean on the signature
instead.

## The freeze

One bench session the confirmation screen began freezing, hard, every time a
successful card debit was immediately followed by a settlement sync. The
heartbeat task kept printing; the UI task sat dead in a five-millisecond sleep it
never woke from.

The cause was not in the money code at all. An SPI-flash write on the ESP32-S3
briefly stops the *other* CPU core with its caches off. The task doing the
journal and settlement writes was unpinned, so it ran on the core *opposite* the
UI — and its flash write dropped the UI core's clock tick, so the UI's sleep
never ended. The fix is one word per task: pin the flash writers to the same core
the UI runs on, and the stall lands on the networking core, which is built to
absorb it. Seventeen hours of uptime and the full bench run later, not a single
freeze. No payment logic changed — only which core a task is allowed to run on.
The same latent bug was found and pinned in the Bitcoin header path, where it had
not surfaced yet.

## Also this fortnight

Adding a product to inventory no longer means typing a thirteen-digit code on
glass: there's a **Scan barcode** button on the Add Item form that arms the head
in place and drops the code into the field, keeping the name and price already
typed. And the bench caught the Add Item keyboard's space bar hiding under the
footer bar — created too early in the draw order — now fixed.

## Next

The prepaid card work has landed on the board-port branch; the remaining items
are a watchdog that reboots a genuinely wedged terminal without false-firing
mid-update, certificate pinning so settlement can't be spoofed on a hostile LAN,
and the on-POS half of vouchers and staff keys. And the secure-element card
itself, once the DESFire stock and a genuine staff tag are on the bench.
