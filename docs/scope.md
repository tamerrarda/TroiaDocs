---
sidebar_position: 4
title: Scope & limitations
description: What the PoC proves and the deliberate testnet boundaries — honest framing.
---

This page draws a clear line between what Troia demonstrably does today and what it deliberately leaves for later. It is written to be read the same way by a newcomer and by a reviewer looking for the catch: everything is stated plainly, including the limits, because a hidden risk is far more damaging than a disclosed one.

Troia is a custodial settlement bridge on the Stellar network. A shopper in Turkey pays in lira with a Troy card through the payment processor iyzico; Troia settles the merchant in US-dollar value as USDC from a pre-funded pool it holds on Stellar; the small spread between the two currencies is the revenue. What follows is delivered as a proof-of-concept on Stellar's test network — a full working system exercised end to end, but with no real money at stake.

## The frame: prove the core first

Troia was built from the inside out. The parts that keep money safe, and the part that lets an outsider verify each payment for themselves, were built and hardened first — before any real rails were connected. Only then came the live payment and blockchain connections, and only then the storefront on top.

This is a deliberate sequencing choice rather than a way of avoiding the hard problems. The safety and verification layers are proven before real value can move through them, so the guarantees can be demonstrated rather than merely asserted.

The test network is where those guarantees are exercised from one end to the other with no real-money risk, because the USDC is minted by Troia itself for testing (explained below). The important point is that the core is not a throwaway prototype: the settlement logic, the defences against double payment, the solvency checks, the frozen price, and the verification tool are the foundation a production system would build on.

## What is proven today

Everything in this section runs offline, with no network connection and no secret credentials, and is covered by automated tests that must pass for every change.

- **The settlement order that makes the system safe.** Sending USDC is irreversible; a lira card charge can be reversed the same day. Troia always performs the reversible charge first and the irreversible payout last, so a failure late in the flow unwinds by cancelling the same-day card sale rather than stranding money. Every step of a payment's life, and every permitted move between steps, is written down and tested.
- **Two independent defences against paying a merchant twice.** Each payout is pinned to a specific blockchain sequence number — a per-account counter the network accepts only once — so a duplicate attempt is rejected by the protocol itself. Behind that, the pool contract keeps its own record of which orders it has already paid and refuses to pay the same one again.
- **Solvency checked in two places.** Troia's backend sets aside pool funds before a shopper can be charged, and the pool contract independently confirms it holds enough before it releases anything. A request that cannot reserve funds is refused up front, before any charge is possible.
- **Pricing the client cannot influence.** The lira price is computed entirely on Troia's servers from four transparent parts: the live mid-market exchange rate, a commission sized to the risk of the roughly three-week settlement wait, a fixed margin, and the payment processor's fee passed through and grossed up so the net still covers the rest after the processor takes its cut. Any price or currency sent by the client is ignored; the shopper is charged exactly the frozen quote.
- **A deterministic exchange rate.** The rate is taken from the median of several distinct market sources, with a check that enough independent sources agree, a staleness limit, and a rule to fail closed when they disagree. No model or guess is involved, and the tested path uses supplied quotes rather than a live feed.
- **The self-verifying evidence tool.** For every payment, Troia keeps independent records of what was intended, what was signed and submitted, and what settled on-chain. An offline tool re-derives the outcome and confirms the three agree, with the network blocked. This is the reviewer's centrepiece, and it works today. See [Reconciliation](./reconciliation.md).
- **The pool contract on Stellar.** The Soroban smart contract that holds the custodial USDC pays out in a single atomic check-and-transfer, so its balance check and the transfer cannot fall out of step. It carries a replay guard, a pause control, and role-restricted administration, and its unit, integration, and conservation tests all pass.

## What the test network deliberately does not prove

The following are conscious boundaries of a test-network proof-of-concept, documented here so they are never mistaken for claims.

- **The USDC is self-minted.** The pool is funded with Troia's own test-network USDC, which it can mint without limit. This fully exercises the solvency *mechanism* — the reservation and the contract's balance guard — but it does not prove *economic* solvency, meaning actually having bought the USDC in the first place. The simulated top-up path is built and tested; only the real exchange purchase that genuinely acquires inventory is deferred. The token is valueless, but the accounting, the solvency mechanism, and the verification logic around it are real.
- **Signed is not the same as settled.** Troia proves what it signed cryptographically, in a way that survives restarts, and separately proves what settled — but only for as long as the chain still remembers it. A wiped test network or a transaction that never landed is reported honestly as unsettled, never as a false match.
- **The one irreversible loss window is named, not hidden.** In the narrow case where the USDC has already been sent but the lira charge cannot be reversed, the order is placed in a visible review state flagged with its evidence, never silently absorbed. On the test network no real value is at stake; this path exists to show the worst case is handled responsibly.
- **The payment processor runs in sandbox mode.** The lira leg runs against iyzico's sandbox with Troy test cards, and a real charge has been carried out successfully. What the sandbox cannot reveal is the true settlement hold — the days iyzico blocks the funds before releasing them, which in practice is far longer than the advertised next-day figure. Because that delay cannot be measured in the sandbox, the commission uses a conservative researched estimate of about twenty-one days. The way Troia reads iyzico's success and decline responses, however, is calibrated against a real charge and iyzico's published response codes.
- **The unit economics are disclosed, not assumed.** The pricing model is complete and does not lose money by construction. But the resulting all-in markup depends heavily on which card rail is used — roughly 7.8% on iyzico credit at current calm volatility, against roughly 3.7% on a bank virtual-POS debit rail — and the settlement-risk portion is data-driven, so it rises when the market grows volatile. The economics improve on cheaper rails, a negotiated processor rate, or a shorter settlement hold. This is a commercial lever, surfaced here rather than buried inside the exchange rate.

## Wired end to end, live run pending

The live test-network rails have been deployed and a real on-chain payout has been proven: three keypairs, the USDC asset, and a seeded pool, with a genuine payment that moved the pool balance, honoured the replay guard, and correctly reverted a double-pay attempt (see [Deployments](./deployments.md)). The piece that joins the two halves into one running system — the real payment processor, the blockchain connection, and the server-side price all assembled behind the backend, with a bootstrap that stands the whole application up — is built, type-checked, and tested offline. A composition test proves the full stack boots and that its fail-closed routes behave. In other words, a real charge driving a real payout is realised in code; what remains is the live run itself.

- **The end-to-end live smoke has not yet been executed.** Standing the app up for a real run needs a public address iyzico can reach to deliver its confirmation, which on the test network means a temporary tunnel. That run — a real charge automatically driving a real on-chain payout — is the remaining step, and it is the first time the network-facing halves are exercised together. It is prepared rather than run: the network calls are hardened with per-attempt timeouts and bounded retries so a hung source fails closed instead of wedging the system, a readiness check smokes each external dependency in isolation, and the whole run is scripted. See [Live-smoke run](./live-smoke.md).
- **The blockchain and processor connectors are type-checked, not yet exercised live.** The code that reads the pool balance and inspects a reverted payout, and the processor's HTTP client, have so far been driven only by stand-ins and type checks. The live run is where they first meet a real network node and the real sandbox.
- **State is held in a single process.** For a one-process proof-of-concept with no restart, in-memory storage is correct. A durable store is the production swap behind the same interface. A restart would lose the in-flight record of a payout, but it fails safe: an unreadable outcome is re-driven, and the contract's own duplicate guard remains the real defence against a double payout.
- **Sequence numbers are allocated late.** The counter that authorises a payout is claimed only once a charge has succeeded, so an abandoned checkout consumes none and the operator account stays gap-free. There is a theoretical window, relevant only to a future durable store, where a crash could strand one such counter — but even that is money-safe, because the duplicate guard and the single-use counter each independently cap delivery at one payout per order. In the current proof-of-concept it is not even reachable: the very crash that could cause it also clears the in-memory counter, so on restart the system simply re-reads the live counter from the chain. A durable store closes the window fully by reconciling the counter on recovery.

None of these are obstacles to the proof described above. They are the remaining path from a system composed and tested offline to one demonstrated live from end to end.

## Explicitly out of scope for this proof-of-concept

The following are future work, called out so the boundary is unambiguous.

- **Real exchange rebalancing and automatic top-up.** The top-up interface and the simulated version are built and tested, but the real exchange purchase that actually acquires USDC, and any automatic trigger to fire it, are deferred. Today the pool is seeded and refilled by hand, and a low-balance threshold only raises a warning. The treasury's cash-flow timing — refills follow the processor's settlement cadence, not how fast the pool drains — is covered on the [Architecture](./architecture.md) page.
- **Customer identity verification.** A designed boundary, inactive on the test network and not yet built as a component.
- **Hardware-backed keys and multi-signature thresholds.** The signing boundary already exists; on the test network a single signature is required, with the same flow shape as a stricter production setup.
- **Parallel payouts.** Today a single-writer counter processes payouts one at a time. Handling many at once is future work behind the same interface, and does not change any guarantee.
- **Third-party checkout extensions.** A bonus integration rail; the demonstration storefront does not depend on it.
- **Mainnet.** Going live is treated as a separate, regulated phase. Turkish regulatory engagement is a deliberate post-build step handled with counsel — genuinely future work, and never an excuse for a gap in anything claimed here.
