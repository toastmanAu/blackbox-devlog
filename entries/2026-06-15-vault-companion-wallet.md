---
title: "Fortnightly #4: BlackBox Vault companion wallet goes on-chain"
date: 2026-06-15
tweet: "Fortnightly #4: working remote paused physical BlackBox work, but the companion wallet flew. BlackBox Vault (native Android) shipped Wave 2 — Nervos DAO, real on-chain post-quantum sends, biometric gates, tx history. The board emulator gained printer + scanner peripherals too."
summary: "BlackBox Vault — the native Android companion wallet — ships Wave 2 with Nervos DAO, real on-chain ML-DSA-65 post-quantum sends, and biometric security gates; the board emulator gains thermal printer and QR-scanner peripherals."
tags: ["wave-2", "wallet", "tooling"]
version: "0.3.0-dev"
do_not_post: true
thread:
  - "BlackBox Vault is the native Android companion wallet. Wave 2 landed Nervos DAO (deposit/withdraw), a mnemonic-verify challenge, transaction history, QR, custom sUDT import, and branding. Five account modes: classic secp256k1, ML-DSA-65 PQ, hybrid, watch-only, and JoyID/passkey."
  - "Post-quantum sends are now real on-chain: retargeted ML-DSA-65 to the live ckb-mldsa-lock v2 testnet deployment with protocol-correct signing and canonical molecule. Also corrected secp256k1 sighash + WitnessArgs and the testnet dep group for DAO and sUDT sends."
  - "Security hardening: biometric re-auth gates on seed export, DAO unlock, and PQ-account sends; closed a mnemonic leak through a nav route. Backed by StrongBox hardware key wrapping (AES-256-GCM via AndroidKeyStore) and RPC failover with health checks."
  - "Embedded tooling kept moving: arduino-board-emulator grew BlackBox POS peripherals — thermal printer (Adafruit_Thermal UART forwarding + in-browser viewer), QR-scanner injection, and ArduinoOTA + AsyncWebServer + mDNS shims. The debug loop keeps shrinking."
---

A remote fortnight. Being away from the bench paused hands-on BlackBox hardware work, but the ancillary components kept turning — and one of them, the companion wallet, took most of the spotlight.

## Companion wallet — BlackBox Vault

BlackBox Vault is the native Android companion wallet for the device: a CKB / Nervos wallet with post-quantum cryptography, hardware-backed key storage, on-chain encrypted messaging, an asset/marketplace surface, and Nervos DAO. This fortnight it shipped its Wave 2 feature set — DAO deposit/withdraw, a mnemonic-verify challenge before activation, transaction history, QR, custom sUDT import, and first-pass branding.

It runs five account modes under one roof: classic secp256k1, ML-DSA-65 post-quantum, a hybrid vault that holds both under one identity, watch-only via xpub import, and JoyID/passkey via redirect-relay signing.

## Post-quantum, on-chain for real

The headline change: post-quantum sends are no longer stubbed. ML-DSA-65 signing was retargeted to the **live** `ckb-mldsa-lock` v2 testnet deployment, with protocol-correct signing and a canonical molecule layout matching the deployed lock. Alongside that, the classic path got cleaned up — canonical secp256k1 sighash and `WitnessArgs`, plus the correct testnet dep group — which unblocked DAO and sUDT sends that the older witness shape was breaking.

## Security hardening

Several gates went in: biometric re-auth before seed export, DAO unlock, and PQ-account sends. A mnemonic-leak path through a navigation route was closed. Underneath, keys are wrapped with StrongBox (AES-256-GCM via the Android KeyStore), and RPC access now fails over across endpoints with health checks.

## Embedded tooling — emulator peripherals

The [arduino-board-emulator](https://github.com/toastmanAu/arduino-board-emulator) kept advancing in parallel, growing the peripherals BlackBox's POS hardware actually uses: a thermal printer (Adafruit_Thermal byte forwarding through the wrapped UART, with an in-browser printer viewer), a QR-scanner injector, and ArduinoOTA + AsyncWebServer + mDNS shims. Each one makes more of the device testable off-bench — which is exactly what a remote stretch needs.
