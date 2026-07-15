---
sidebar_position: 1
slug: /
title: Overview
description: What Troia is — a custodial TRY→USDC settlement bridge on Stellar that makes every lira accountable.
---

Troia is a bridge between two kinds of money. A shopper in Turkey pays in lira with an ordinary card; a merchant somewhere else receives US-dollar value as USDC on the Stellar network. Troia stands in the middle, converts one into the other, and carries the risk of doing so.

The shopper pays in lira with a Troy card — Turkey's domestic card scheme — through the payment processor iyzico. Troia settles the merchant immediately in USDC from a pool it funds in advance. The difference between the lira collected and the dollar value delivered is where Troia earns its margin.

The point of the design is not that you have to trust Troia. It is that anyone can verify each settlement against the public blockchain record. Troia aims to make every lira accountable.

## The problem it solves

Troy is Turkey's domestic card scheme, and that domesticity is its limit: a Troy card works throughout Turkey but is not accepted by merchants abroad, whose checkouts settle on the global card networks. A Turkish shopper who wants to buy from an international merchant — increasingly, one that accepts payment in crypto — cannot do it with the card in their pocket.

Troia closes that gap. The shopper pays Troia in lira with their Troy card, in exactly the domestic setting where it works, and Troia settles the merchant abroad in USDC on Stellar. A domestic card thus reaches an international merchant it otherwise could not; the merchant, for its part, simply receives an ordinary crypto payment — funded, converted, and reconciled by Troia, which absorbs both the currency conversion and the risk that the exchange rate moves during the days-long settlement window.

In practice, a shopper never installs a wallet or handles a seed phrase. The way Troia is used is a small browser extension: on a supported storefront checkout it recognises the crypto payment request, offers to settle it with a "Pay with Troy card" button, and — when the shopper accepts — opens the ordinary iyzico card form. That extension is the everyday entry point to everything described below; it holds no keys and signs nothing itself, leaving the payout to Troia's backend.

## How one payment flows

A single payment moves through four steps, and the order of those steps is the whole safety story.

1. **Price and reserve.** When an order begins, Troia prices it entirely on its own servers — from a live exchange rate and a transparent commission — and sets aside enough USDC in the pool to cover the payout. Only then does it hand the shopper a hosted iyzico payment form. A client can never dictate the price or the currency.
2. **Charge.** The shopper pays the lira amount with a Troy card, confirmed by 3-D Secure, on iyzico's hosted form. Card details never touch Troia's servers.
3. **Settle.** Once the charge is confirmed, and only then, Troia sends the USDC — the single irreversible step — by instructing the pool contract on Stellar to pay the merchant.
4. **Reconcile.** Every payout is written to a permanent, append-only record and later matched to its on-chain transaction in a report anyone can check.

## Why it is safe with money

The two halves of a payment behave differently when something goes wrong. Sending USDC is irreversible: once it leaves the pool it cannot be recalled. A lira card charge is reversible: a sale made today can be cancelled the same day. Troia is built around that asymmetry — it always takes the reversible action first and the irreversible one last, so it never gives away USDC without first securing the lira behind it. If a settlement fails after the shopper has been charged, Troia cancels the sale and returns the lira rather than stranding a loss.

Paying a merchant twice for one order is ruled out by construction. Each payout is pinned to a specific Stellar sequence number — the one-time counter the network uses to order an account's transactions — and the network accepts a given number only once, so a duplicate attempt is simply rejected. As a second line of defence, the pool contract itself records which orders it has already paid and refuses to pay the same one again.

## It has been done for real

The full flow has been exercised repeatedly: a shopper pays with a Troy card on iyzico's hosted form, and a merchant is settled in USDC on Stellar, with every step in between running on its own. One representative run — settling 80 USDC — is recorded, transaction by transaction, on the [Deployments](./deployments.md) page. The accounting matched the chain to the last unit; the server was then killed and restarted, and nothing was paid, minted, or recorded twice.

That last part is not incidental. Everything Troia knows about money is written to disk before it is believed, and two background watchers read the blockchain directly rather than trusting Troia's own account of events — one to notice money leaving the pool that nobody authorised, the other to re-check each settlement against the chain by an identifier the pool contract itself keeps.

The accusing watcher is no longer only a claim. A payout was deliberately sent straight to the pool contract by hand, bypassing Troia's backend entirely, so that its transaction never reached the list of payouts Troia had authorised. The watcher caught it unprompted, named it as a rogue payout, and wrote it permanently to its own record — where it remains even after the balance was topped back up. The code that caught a staged thief is the code that would catch a real one.

## Where to go next

- **[Architecture](./architecture.md)** — the settlement ordering, the life of a payment, the two Stellar entities, the treasury and its cash-flow cycle, how the system survives a crash, and the guarantees behind each step.
- **[Reconciliation](./reconciliation.md)** — the centrepiece: how each order is matched to the chain so a reviewer can verify it independently.
- **[Scope & limitations](./scope.md)** — what is proven, and what is a deliberate test-network boundary, framed honestly.
- **[Toward mainnet](./toward-mainnet.md)** — what stands between the proof-of-concept and a system that moves real money.
- **[Deployments](./deployments.md)** — the live test-network address table, and the runs that prove the money path.
- **[Live-smoke run](./live-smoke.md)** — how a real Troy-card charge drives a real on-chain payout.
- **[Demo script](./demo-script.md)** — a guided walk-through of the whole flow.

:::note Status
This is a proof-of-concept running on the Stellar test network. The USDC is Troia's own test mint, iyzico runs in sandbox mode with valueless test cards, and no real money moves. The boundaries between this proof-of-concept and a production system are documented plainly in [Scope & limitations](./scope.md).
:::
