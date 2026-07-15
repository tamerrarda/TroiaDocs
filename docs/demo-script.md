---
sidebar_position: 8
title: Demo script
description: The short end-to-end demo walkthrough.
---

This is a short, guided walkthrough of Troia from end to end. It is written to be run in front of a reviewer, but it also reads on its own as a tour of what the system does and why. The whole thing takes about four minutes and makes a single claim impossible to miss: Troia never silently loses money, and anyone can verify that for themselves, offline, in a few seconds.

The walkthrough is deliberately honest about what a viewer is watching. The runnable acts need nothing more than a checkout of the repository and no network connection at all; the closing act narrates a payment path that has since been driven twice, for real, on the test network. Each part below says plainly which it is.

## What the walkthrough shows

The tour has five acts, and they build on one another:

1. **The code is real and under test.** Everything compiles, the test suites pass, and the linters are clean.
2. **You can check the money yourself, offline.** An independent tool re-derives every payment's outcome from published evidence, agrees with an honest report, and rejects a tampered one.
3. **The money moves in a safe order.** A narrated walk through the payment lifecycle, keeping the honest line between what Troia signed and what actually settled on-chain.
4. **It has been done for real.** A card charge on the test network drives a payout on Stellar, the books come back matching the chain, and the pool refills itself.
5. **A thief gets caught.** An unauthorised payout is flagged by a watcher nobody prompted — the point being that you do not have to trust the operator, not even Troia itself.

The second act is the heart of it. It is the one thing a reviewer cannot get anywhere else: the ability to confirm, without trusting Troia or touching its servers, that each payment settled exactly as intended. The fifth is the sharpest, and it has been run for real.

## Before you begin

The runnable parts need only a checkout of the repository and its toolchain — no configuration file and no network connection. Install the toolchain listed in the project README (Node 22, pnpm, Rust with the `wasm32v1-none` target, the Stellar CLI, and `just`), then install dependencies once:

```bash
pnpm install
```

Type the commands live during the demo. They are short, and running them in the open shows there is nothing hidden between the words and the result.

## Act 1 — The code is real

The first act simply establishes that this is working software, not a slide deck. It compiles every package, runs the full test suites, and checks the linters. The point to make while it runs is that the entire core — the money logic, the exchange-rate oracle, the payment state machine, the payment-processor adapter, and the Stellar pool contract — is testable offline, with none of Troia's servers running.

```bash
just build
just test
just lint
cargo test
```

## Act 2 — Prove it yourself, offline

This is the centrepiece, and it deserves the most time. It answers the question a reviewer really cares about: how do you know a payment was accounted for correctly without taking Troia's word for it?

Run the reviewer's verification tool:

```bash
just verify
```

It exits successfully, and that success is meaningful for three reasons worth narrating out loud:

- **It genuinely runs offline.** The tool makes no network calls, and a startup check confirms the network really is blocked — a deliberate connection attempt is made and must fail before the run proceeds. The offline guarantee is enforced, not merely observed.
- **It recomputes rather than trusts.** The verifier ignores the report's own stated verdicts and re-derives each one from scratch, using the signed transaction and the on-chain snapshot embedded in the report, checked against a pinned operator key and the real Stellar transaction hash.
- **It catches a planted error.** One order in the sample is a deliberate mismatch: the local record says one amount, while the signed transaction and the chain both say another. The tool flags it as a corrupted local record, notes that the signature is nonetheless valid, and concludes correctly that the mistake is in Troia's own bookkeeping — the chain is the authority.

Then break it on purpose. Point the same verifier at a tampered report — one whose stated outcomes have been edited to lie about what really happened:

```bash
just verify-tampered
```

This run fails, and the failure is the point. A report that lies about its own outcome cannot pass, because the tool recomputes every verdict and refuses to accept a claim the evidence does not support.

One more command is worth typing, because it is the strongest evidence Troia has and it too runs with the network blocked. It re-verifies a report captured from a payout that genuinely landed on the test network:

```bash
just verify-live
```

That is the whole guarantee, in three commands. The full model behind it is on the [Reconciliation](./reconciliation.md) page.

## Act 3 — How the money moves

The final act narrates the payment lifecycle. No live payment is needed; the point is to explain the order of operations and why it is chosen that way. The guiding idea is that Troia always performs the reversible action first and the irreversible one last, so it never gives away USDC without first securing the lira behind it.

A single payment proceeds like this:

1. **The order is priced and the pool is reserved.** The backend computes the lira price entirely on its own servers — the live exchange rate plus commission — and sets aside enough USDC in the pool to cover the payout. If the pool cannot cover it, the request is refused before the shopper is ever charged. The shopper is then shown a hosted payment form for exactly that frozen price. A client cannot dictate the price or the currency.
2. **The shopper pays in lira.** They complete the charge on the payment processor's hosted form; their card details never touch Troia's servers.
3. **Only then does the USDC move.** After the charge is confirmed, and only then, the backend submits the irreversible payout by invoking the pool contract, pinned to an order-specific sequence number so it can take effect at most once. The irreversible step is deliberately last.
4. **The payment is confirmed and reconciled.** The merchant has their USDC, and the order passes into reconciliation.
5. **A failure after the charge is unwound.** If the payout cannot be made, the lira sale is voided the same day, so no funds are stranded. The one situation that cannot be unwound cleanly — USDC already sent, but the lira charge unable to reverse — is surfaced in a visible review state and never hidden.

Throughout, the storefront sees only a coarse status: pending, then processing, then completed, or else failed or under review. The USDC leg is never exposed to the merchant's checkout.

Close on the honest boundary. Troia proves what it signed with cryptography that survives a restart, and what settled while the chain still remembers it — and it never blurs the two.

## Act 4 — It has been done for real

The narration in Act 3 is not hypothetical. Twice now, a shopper has started at the demonstration storefront, taken up the "Pay with Troy card" browser extension when it offered to settle the checkout, paid with a Troy sandbox card on the iyzico form it opened, and seen a merchant settled in USDC on Stellar — with every step in between running unattended. In the most recent run, the accounting ledger and the pool's on-chain balance agreed to the last unit, and the pool came back larger than it went out because the shopper had paid the commission. About thirty seconds later — the demonstration compresses the real settlement wait of roughly three weeks — a background worker refilled the pool from that same order's lira, so the growth by the commission happens in front of the reviewer rather than in a footnote.

The run can be shown rather than described: open the transaction on a public block explorer, and open the [Deployments](./deployments.md) page beside it.

## Act 5 — Catch a thief

If there is time, close on the sharpest beat, because it is the one that best explains why any of this matters. With the system running, send a payout straight to the pool contract by hand, bypassing Troia's backend — so its transaction is never written to the list of payouts Troia authorises before it broadcasts them. Nobody tells the watcher to look for it. Within the grace window it pages on its own:

> ROGUE PAYOUT: USDC left the pool in a transaction this operator never authorised — its hash was never written to the pre-broadcast journal.

Say what it means: the watcher reads every outflow from the pool directly off the chain and matches each one against the journal of payouts Troia pre-authorised. An outflow with no match is flagged and written down permanently — and the record survives even after the balance is made whole again. This fired for real on 14 July 2026; the transaction is on the [Deployments](./deployments.md) page.

Then be candid about the edges, because volunteering them is more persuasive than the demo itself: a *different* transaction settling an order, and the watcher's two "we could not see" states, are still exercised by tests rather than on the chain — the [Scope & limitations](./scope.md) page lists exactly which.

If there is time for one more thing, kill the server and start it again. Nothing is paid, recorded, or refilled twice, and the settled order still answers for itself — because everything Troia knows about money reached the disk before it was believed.

:::tip Recording a video
If you capture this as a video, keep it to three to five minutes and give Act 2 the most room. Show the exit codes explicitly so the pass and the fail are unambiguous. Never fake a payment. End on the tampered-report failure; it is the most memorable and the most convincing beat.
:::

For the deeper detail behind this walkthrough, see the [Architecture](./architecture.md), [Reconciliation](./reconciliation.md), and [Scope & limitations](./scope.md) pages, and the [Live-smoke run](./live-smoke.md) for the whole flow working end to end on the test network.
