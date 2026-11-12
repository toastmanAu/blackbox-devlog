---
title: "Fortnightly #11: the terminal checks the chain itself"
date: 2026-11-12
tweet: "Fortnightly #11: BlackBox now confirms a CKB payment on its own. A light client on the ESP32-S3 talks to public nodes, verifies the proof of work and the block, and credits the sale. No server of ours, and the phone is only a fallback."
summary: "The terminal now runs a CKB light client and confirms sales itself, against any public node, with the phone kept as a fallback. Twenty bench sales out of twenty confirmed, then a mainnet sale. Alongside: the link to the Vault is pinned to a key carried in the pairing QR, staff keys get a PIN, the terminal keeps a usage log for the Kenya trial, and two bench hangs turn out to be a receipt printer and a 32-bit timer."
tags: ["wave-2", "firmware"]
version: "1.0.0-dev"
do_not_post: true
---

Early this month a customer paid 4,277 CKB to the terminal's QR code. The payment
landed on chain and the terminal never noticed. It was waiting for the phone to
tell it, and the phone was not listening. That set the rule for this period: the
terminal must be able to confirm a sale by itself, from any public CKB node,
with no second machine in the loop.

## A light client in the till

The work started upstream, in `ckb-light-esp`, the light client library the
terminal vendors. It could already find a chain tip. It could not yet prove a
payment. It now downloads the block a filter points at, checks that block's
transaction root, walks the transactions, and reports what they did to the
merchant's lock: shannons in, shannons out, and whether the merchant signed.
A cell set with an undo journal keeps the running balance and can roll back
across a reorg. Host tests went from 408 to 2,229.

The proofs got stricter on the way. A node's claim about the chain tip must now
carry real proof of work, link back to a block the terminal already trusts,
survive random sampling of the chain between the two, and follow a reorg rather
than refuse it. Before this, a peer could have invented a tip.

On the terminal, the light client runs as its own task beside the existing
phone path. Whichever source proves the payment first confirms the sale, and
the QR screen and the receipt name the source. The terminal still holds no
spending key. It only watches.

## What only the live network showed

Unit tests ran green long before the thing worked. The live network supplied
the rest:

- The testnet identify string in our plan was wrong, and the wrong one earns a
  five-minute ban. That explained an older note that "testnet doesn't serve
  filters".
- One real block filter was 13.8 KB against an 8 KB cap, and sync stalled on it
  for good. Over-size filters are now hashed through and the block is fetched
  anyway.
- The design's receive buffer was 68 KB. The logs from a full-history run held
  thousands of messages above that, the largest 184,707 bytes. The real floor
  is 786,460 bytes, which on this board means PSRAM.

That last one came from reading the log of a real run instead of the spec. A
full walk of a testnet address's history then matched the node's own balance
exactly.

## The bench run

The acceptance run was twenty sales in a row with everything live at once.
All twenty confirmed: seventeen by the light client, three by the phone path,
with a typical wait of about 55 seconds. A many-input payment passed, and on
11 November the terminal confirmed a mainnet sale on its own.

The run still failed as written, because the screen kept freezing. None of the
causes were in the payment code. A receipt takes 14 seconds to print and was
printing on the UI thread, so printing moved to its own task. A separate
seven-minute hang was the printer library's pacing timer: it counts
microseconds in 32 bits and wraps after about 36 minutes idle, so the first
receipt after a quiet spell waited for a deadline in the past. And "New sale"
was stacking screens until the third sale silently refused to open.

## Pinning the Vault

Every call from the terminal to the Vault used to accept any TLS certificate
and trust whichever device answered first on the LAN, then hand over its access
token. The fix uses something the till already does: scan the pairing QR. The
QR now carries a hash of the Vault's public key, and the terminal refuses any
connection whose key does not match, before it sends a byte.

Two things turned up along the way. The Vault's certificate had been a
three-day RSA-1024 default, expired for nearly its whole life, and nothing had
noticed because nothing checked. And the final review found that the HTTP
library quietly reconnects after a reset, without re-checking the pin, which
would have let an attacker relay the handshake and then take over. The
terminal's client now cannot open a socket that skips the check.

## A PIN on the staff key

A staff key is a tag recognised by its NXP signature, and that signature can be
read and copied by any phone that touches it. So a staff key now needs a PIN,
set in the Vault and typed on the terminal's keypad. Three wrong tries lock the
key, and only a new PIN from the Vault unlocks it. The Vault side is built and
merged. The terminal side is next.

## A diary for the trial

The Kenya trial needs to know how terminals are actually used, and the firmware
kept no history at all: a sale lived in memory until the next one. The terminal
now writes small fixed-size event records to a ring on flash and uploads them
hourly to a Cloudflare Worker, which serves a CSV and a daily summary to the
trial team. Card numbers are hashed before they leave the device.

## Also this period

The terminal accepts every CKB address format and stores the full form, after a
short-format address broke light-client confirmation. The payment QR can be
switched to address-only for wallets that reject an amount, and the shortened
address on screen opens to the full one. Three CI gates that had been red since
late October are green again, and the repository finally has a README.

## Next

The terminal is short of one specific kind of memory. Encrypted connections
need small buffers from internal RAM, and when several run at once they fail.
A fix is on the bench now and soaking. After that: balance, history and the
sweep amount straight from the light client, so the Merchant Wallet screen no
longer needs the phone either, and the terminal side of the staff PIN.
