---
sidebar_position: 2
title: Architecture
description: How Troia is built, and why it is safe with money — the settlement order, the payment lifecycle, the pooled treasury, and the guarantees behind each step.
---

This page explains how Troia is put together and, above all, why it is careful with money.

Troia is a bridge. A shopper in Turkey pays in lira with an ordinary card; a merchant somewhere else receives US-dollar value as USDC on the Stellar network. Troia stands in the middle, converts one into the other, and carries the risk of doing so. The single most important design idea is the *order* in which the two sides of that conversion happen — everything else follows from it.

## Who does what

Three parties take part, and each sees only its own side of the transaction.

- **The shopper** pays a single lira amount with a Troy card (Turkey's domestic card scheme), through the payment processor iyzico. They never see an exchange rate, a token, or the word "crypto".
- **The merchant** receives an ordinary USDC payment on Stellar. They never see the lira that funded it.
- **Troia** sits between them. It owns the currency conversion and the settlement risk, and it keeps a pre-funded pool of USDC so the merchant can be paid immediately, without waiting for the lira to arrive.

Because the pool is funded in advance, the merchant is paid at once. The only party who waits is the shopper, for the ten to forty-five seconds it takes the payment to settle on-chain.

## The order of operations is the safety

The two halves of a payment behave very differently when something goes wrong:

- Sending **USDC is irreversible.** Once it leaves the pool, it cannot be recalled.
- A **lira charge is reversible.** A card sale made today can be cancelled the same day, returning the money to the shopper.

Troia is built around that asymmetry. It always performs the reversible action first and the irreversible one last, so that at no point has it given away USDC without first securing the lira behind it. A single payment proceeds in four steps:

1. **Reserve.** Before the shopper can be charged, Troia sets aside enough USDC in the pool to cover the payout. If the pool cannot cover it, the request is refused up front and the shopper is never charged.
2. **Charge.** The shopper pays the lira amount on iyzico's hosted payment form. Card details never touch Troia's servers.
3. **Settle.** Only after the charge is confirmed does Troia send the USDC, moving it from the pool to the merchant on Stellar.
4. **Confirm.** Troia records the on-chain result and hands it to reconciliation, the process that later proves the payment matched what was intended.

Placing the irreversible step at the very end removes the worst failure of a naive bridge: paying out crypto and then discovering the card charge never went through. If the settlement step fails *after* the shopper has been charged, Troia cancels the completed sale the same day and returns their lira — a clean, reversible unwind rather than a loss.

There is one narrow situation that cannot be unwound cleanly: the USDC has already been sent, but the charge cannot be reversed — for example, the cancellation itself keeps failing, or the fate of the payment is genuinely unknown. Troia does not hide this. Such an order is placed in a dedicated review state that is always visible and never silently discarded. When a loss does happen, it is Troia's loss to absorb, never the customer's. On the test network no real value is ever at stake; this path exists to show the system handles the worst case responsibly.

## The life of a payment

Every order moves through a fixed, well-defined set of states, and the rules for moving between them *are* the safety model. Nothing in the money path is ad-hoc.

The normal, successful journey is: a new order reserves pool funds, shows the shopper a payment form, receives a confirmed charge, sends the USDC, sees it confirmed on-chain, and is finally reconciled. Alongside that path are a handful of states that exist purely to resolve the irreversible step when the network is slow, a transaction is delayed, or a payment must be retried.

A few rules govern every transition, and each one is backed by an automated test:

- **Reserve before charging.** Pool funds are always set aside first. A shopper is never charged unless the USDC to pay them is already reserved.
- **Settle last, and never on doubt.** USDC is sent only after a *confirmed* charge. If the charge result is uncertain — a timeout, a dropped connection, an ambiguous response — the order waits and checks again. Uncertainty never triggers a payout.
- **Write down the intent before acting.** Troia records that it is about to send USDC before it actually sends it. That way, after a crash or restart, a state can reliably mean "the payout has definitely not started yet."
- **Treat every outcome as three-valued.** Reserving funds, charging the card, and cancelling a sale each have three possible results: success, definite failure, or unknown. An unknown result always leads to waiting and re-checking, never to an irreversible action.
- **Decide "dead" by evidence, not by a clock.** A delayed payout is only considered abandoned — and therefore safe to retry — when the blockchain itself confirms the original could no longer take effect. Troia never guesses this from elapsed time.
- **Retry and re-issue are opposites, and it knows which is which.** A transaction that never took effect can be safely re-sent as-is. A transaction that took effect and then failed can never be re-sent the same way — the network would reject it — so Troia issues a fresh one instead. Confusing the two is exactly the kind of mistake that causes a double payment, so the two cases are kept strictly separate.
- **Recovery never blindly re-sends.** On restart, Troia first *observes* what already happened before doing anything. It re-sends a payout only in the one provably safe case: the charge succeeded but the payout was never actually submitted.

Because these rules are encoded as the only permitted transitions, a category of money-losing bug — sending twice, sending on an unconfirmed charge, or abandoning a live payment — is ruled out by construction rather than caught after the fact.

## One identity for every check

A single payment is protected by several independent checks: the payment memo that ties an on-chain transfer back to its order, the blockchain sequence number that makes a duplicate transaction impossible, and the contract's own guard against processing the same order twice. These checks only work if they all agree on *which order they are talking about*.

To guarantee that agreement, every one of them is derived from a single order identifier through one deterministic function. Given the same order, that function always produces the same memo, the same transaction identity, and the same idempotency key, byte for byte. Two independently written components can therefore never disagree about whether a given payment is new or already handled.

That identity discipline also underpins Troia's two defences against paying a merchant twice:

- **The sequence number.** Each payout is pinned to a specific Stellar sequence number, and the network accepts a given sequence number only once. If a first attempt has already taken effect, a second attempt with the same number is rejected outright by the protocol — no contract logic is even needed.
- **The contract guard.** In the rarer case where a retry would use a *different* sequence number, the pool contract itself records which orders it has already paid and refuses to pay the same one again. This is why the transaction's identity is derived from the order, not from the transaction's own hash: a second, differently-shaped attempt must still collide on the same key.

Together, these mean at most one payout can ever reach a merchant for a given order, regardless of retries, restarts, or network hiccups.

## The two Stellar identities

Troia uses two distinct entities on Stellar, and keeping them separate matters.

| Entity | What it is | Its role |
|---|---|---|
| The pool | A smart contract on Stellar (Soroban) | Holds the custodial USDC and moves it to the merchant when instructed |
| The operator | An ordinary Stellar account | Signs and submits every payout, and owns the sequence number that makes duplicates impossible |

The contract holds the money; the operator authorises spending it. Because the operator has a single sequence number, payouts are processed one at a time — a deliberate constraint that keeps the double-payment guarantee simple. Handling many payouts in parallel is a planned future step and does not change any of the guarantees described here.

Payouts are always made by invoking the pool contract directly, not by sending an ordinary Stellar payment. The memo that links a transfer to its order is part of that contract call, carried as data rather than as a plain transaction note.

## The treasury and rebalancing

The pool is Troia's treasury, and when it is refilled is dictated by the payment processor, not by how quickly it drains. The two sides of a payment are deliberately out of step: USDC leaves the pool the moment a payment settles, but the matching lira is not released to Troia by iyzico until after a settlement hold — typically two to twenty-one days in Turkey, depending on volume and contract, rather than the "next day" often advertised. In other words, the treasury spends now and is repaid roughly three weeks later.

Three consequences follow:

- **The pre-funded pool bridges the gap.** The pool must hold enough USDC to cover a full settlement window of outflow before the first lira comes back. That is precisely why it is funded in advance, and why the merchant never has to wait for a conversion.
- **Rebalancing means turning collected lira back into USDC.** Only once iyzico releases the held lira can Troia buy replacement USDC and top the pool back up. In production this is a real purchase on an exchange; on the test network it is simulated by minting test USDC. Either way it is recorded in the accounting ledger so the books stay in step with the on-chain balance.
- **The price already accounts for the wait.** Because Troia pays out at today's rate and only buys replacement USDC weeks later at an unknown rate, the commission it charges includes a buffer sized to that delay. The cost of the settlement window is priced in before any rebalancing happens.

In the current proof-of-concept, rebalancing runs on its own. A background worker watches every settled order and, once its holding period has elapsed — compressed to about thirty seconds for the demonstration, against the roughly three weeks of the real thing — refills the pool from the lira that order collected, at the live exchange rate. Because the shopper paid the commission on top of the mid-market rate, the pool comes back slightly larger than it went out: it grows by the margin. A low-balance threshold now only warns, because it is no longer the trigger.

What is still simulated is the purchase itself. On the test network the refill mints Troia's own test USDC; in production the same step becomes a genuine trade on an exchange, behind an interface that already exists and is exercised on every settlement. The decision of when and how much to rebalance, and the execution of the trade, are deliberately separate, so production replaces one implementation rather than the logic around it.

## Surviving a crash

A system that moves money has to be able to say, after the lights come back on, what it had already done. Troia's rule is that no fact about money is believed in memory until it has first been written to disk. The files it writes to are append-only, and the rules for what a crash may do to them are stated rather than hoped for.

A record that was only half written can, by construction, only ever be the last thing in a file: the first failed write poisons the file permanently, so nothing can ever be appended after it to bury the damage in the middle. Such a torn ending is repaired on the next start and reported. A record that was fully written and later found to be damaged is a different matter entirely — the writing had finished, so the damage came afterwards — and Troia refuses to start rather than quietly discard a payment it had committed to. If the store ever rejects a write at all, the process stops, because a system that cannot record what it is doing must not keep doing it.

Seven such files hold, between them, the accounting ledger, the evidence for each settlement, the identity of every payout authorised before it was broadcast, what the chain was observed to say, which orders have been reconciled, and the payout watcher's place in the chain's history. Not everything is durable, and the boundary is drawn on purpose; the [Scope & limitations](./scope.md) page says exactly what a restart still forgets and why that fails safely.

## The chain answers for itself

Troia does not take its own word for what happened. Two background watchers read the blockchain directly and are built so that neither can be talked out of the truth by a bug elsewhere in the system.

The first watches money leaving the pool. It reads the token contract's own transfer records rather than the pool's announcements about itself, because a pool whose code had been replaced could move funds without announcing anything, while the token contract cannot be persuaded to stay silent. It can accuse with confidence for one reason: a payout's identity is written to disk *before* the transaction is broadcast, so a transaction cannot possibly have landed unless its identity was already recorded. Money that left the pool without a matching record was therefore never authorised — not "not yet noticed", not "still settling". There is no timing window to get wrong, and no in-memory list a restart could erase.

The second watches settlements. It finds an order's settlement by the identifier the pool contract itself indexes, which is derived from the order — not by the transaction hash Troia recorded. Looking it up by Troia's own hash would only ask Troia's records to confirm Troia's records. Five things must all hold before an order is called reconciled: the settlement is found under the order's own identifier at all, the pool's code was never replaced, the amount the pool announced equals the amount the token contract actually moved, the transaction is still on the chain, and the offline verification model agrees. A chain it cannot reach concludes nothing at all.

The two are complements. A separate tripwire compares the accounting ledger's idea of the pool balance against the chain's, which is always right about the total but cannot name a transaction; the watcher names it, at the price of a limited window into the chain's memory. Where that window falls short, Troia says it could not see rather than accusing anyone, and every alarm is raised once per problem rather than repeated on every pass.

## The guarantees

Each of the following guarantees is owned by a single, well-defined part of the system, so there is always one clear place responsible for it.

| Guarantee | How it is enforced |
|---|---|
| A payout is only ever created with a valid destination, memo, and trustline | The order cannot even be constructed otherwise; an invalid one is rejected before any charge |
| A merchant can never be paid twice for one order | The pinned sequence number plus the contract's own duplicate guard |
| The pool can never be over-committed | Funds are reserved in the backend, and the contract independently checks its balance before paying |
| Every payout leaves a permanent, verifiable record | Each submission writes its transaction and signature to an append-only evidence log |
| The shopper is charged exactly the quoted price | The lira price is computed and frozen server-side; the payment form charges that and only that |
| A charge is never processed twice | A combination of a backend guard, a server-issued token, and a re-check of the outcome |
| A failed payout returns the shopper's money | A post-charge failure cancels the same-day sale automatically |
| A fact about money is never believed before it is written down | Every writer appends to an append-only file first, and a refused write stops the process |
| Money cannot leave the pool unnoticed | A payout's identity is recorded before it is broadcast, so an unrecorded outflow was never authorised |

## Pricing

The lira price a shopper pays is computed entirely on Troia's servers and cannot be influenced by the client. It is built from four parts: the live mid-market exchange rate, a commission whose size reflects the risk of the roughly three-week settlement window, a fixed margin, and the payment processor's own fee passed through. The shopper is shown a single lira total; the breakdown exists so the economics are legible, not so the customer has to reason about them.

## Reconciliation

Reconciliation is how Troia turns "trust us" into "verify it yourself". For every payment it keeps three independent records: what was intended, what was signed and submitted, and what actually appeared on the blockchain. An offline tool re-derives the outcome from these records and confirms they agree, so a reviewer can check that every payment settled as intended — using only the published evidence, with no access to Troia's systems and no need to trust them. This is important enough to have its own page; see [Reconciliation](./reconciliation.md).

## Keys and configuration

Troia keeps three separate keys, even on the test network, so that no single one can do everything: an administrator key that governs the contract, an operator key that signs payouts, and an issuer key that mints the test USDC. Alongside these are the credentials for the payment processor. Every secret lives only in local environment files and is never committed to source control.

The public half is deliberately the opposite. The record of the one deployment — the pool, the contracts, and the public addresses above — is committed to the repository, because every value in it is public and committing it is what makes "one pool, unchanging" true for every clone rather than something each machine re-invents. Everything specific to a particular network is supplied as that configuration rather than written into the logic, so moving from test to production is a change of settings, not a change of code.

## Key design decisions

The choices below shape the system; each was made deliberately and is treated as a fixed commitment.

1. **Stellar only.** A single settlement network, not a multi-chain abstraction.
2. **A deterministic exchange rate.** The rate comes from the median of several public market sources with outlier rejection and a circuit breaker — never from a model or a guess.
3. **Charge first, settle last.** The reversible lira charge always precedes the irreversible USDC payout, and a failure after the charge cancels the sale the same day.
4. **Transparent, legible pricing.** The price is a sum of clearly separated parts rather than a hidden markup, even though the shopper only ever sees the total.
5. **Solvency checked in two places.** Both the backend and the contract independently refuse to pay more than the pool holds.
6. **Fail closed on identity.** A payout with a missing or invalid destination or memo is rejected outright.
7. **A pre-funded, custodial pool.** Troia carries the float and the risk so the merchant is paid instantly.
8. **A gateway-aware browser extension.** The extension recognises a supported checkout and offers to pay with a Troy card; it holds no keys and signs nothing, and always falls back to a manual option.
9. **Every dependency behind an interface.** Payment processor, exchange, and signing are all swappable, so production is a matter of configuration and a few concrete implementations — plus a re-check of the timing budget and the closing of two named engineering gaps. It is deliberately not a switch to flip; [Toward mainnet](./toward-mainnet.md) says exactly what is left.
10. **Test network today, regulated production later.** Going live is treated as a separate, regulated phase rather than a flip of a switch.

For anyone who wants the full engineering detail behind these decisions, the [Reconciliation](./reconciliation.md) and [Scope & limitations](./scope.md) pages go deeper, and the [Live-smoke run](./live-smoke.md) shows the whole flow working end to end on the test network.
