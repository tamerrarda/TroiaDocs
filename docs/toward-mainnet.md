---
sidebar_position: 5
title: Toward mainnet
description: What stands between the proof-of-concept and a system that moves real money.
---

The test network proves that Troia is correct. It cannot prove that Troia is ready to hold someone's money. Five things stand between the two, and none of them is a rewrite: the settlement logic, the defences against double payment, the pricing, and the verification tool all stay exactly as they are. What changes is configuration, three provider implementations, one careful re-validation of the timing budget against the payment processor's real settlement hold — the figure the sandbox cannot reveal — and two engineering gaps that a proof-of-concept could not honestly close, because closing them changes how the money path behaves after a crash and neither fix could be exercised for real on a network where nothing is at stake.

## Buying the USDC rather than minting it

Today the pool is refilled automatically, but with test USDC that Troia issues to itself. Production replaces that single step with a genuine purchase on an exchange, funded by the lira the payment processor releases after its settlement hold.

The change is contained on purpose. The decision of when and how much to rebalance is already separate from the execution of the trade, and both interfaces are exercised on every settlement today. What production supplies is one new implementation behind the second of them — and the working capital to stand behind it, which is the part that costs money rather than engineering.

## Writing the refill down before it happens

The refill has a gap of its own, and it is the reason the step above cannot be taken on its own. The guard that stops an order from being refilled twice is durable, but it is consulted *before* the top-up moves and only recorded *after* it has landed. A crash in between leaves a top-up that happened and was never written down; on restart the order looks unrefilled and does it again.

On the test network that misfires in the harmless direction — the pool ends up holding more than the books claim, so nobody is short-changed — but the books and the chain then disagree forever, and an alarm that can never be cleared is an alarm people learn to ignore. In production the same window spends real lira twice. So the exchange purchase does not retire this bug; it is what makes it expensive, and the fix has to land before or with it. The fix itself is not new: it is the discipline the payout path already follows, which writes down what it is about to do before it does it. The refill is simply the one money path that does not yet.

## A durable store for orders

Everything Troia knows about money already survives a crash: the accounting ledger, the evidence for each settlement, the record of every payout authorised before it was broadcast, and what the chain was observed to say. The orders themselves do not.

Two consequences follow, and both are named on the [Scope & limitations](./scope.md) page rather than buried. A crash between the shopper's payment and the payout leaves the order unrecorded, so nobody drives it forward and nobody cancels the sale. And because the lock that reserves pool funds lives inside a single process, two copies of the backend could each reserve the last coin — the pool contract still refuses to be overdrawn, but the backend's own guarantee disappears.

Neither is patched on the test network, and that is deliberate rather than an oversight. Both are closed by the same change: real database transactions holding the orders alongside the records that already persist. That change alters how the money path behaves after a crash — recovery would begin resuming payments it currently forgets — and it belongs to the phase where a mistake costs real money and can be tested against a real store, not to a proof-of-concept where the fix could not be exercised honestly.

## Custody that no single key can undo

Three separate keys already govern the system on the test network, and the signing boundary the backend talks to is the same one a stricter setup would use. Production raises the signing threshold, moves the keys into secure hardware, and adds the multi-signature and timelock protections that make an administrative mistake recoverable. The flow the rest of the system sees does not change.

Alongside this sits customer identity verification, designed as a boundary today and inactive on the test network, and the handling of many payouts in parallel, which today are processed one at a time to keep the double-payment guarantee simple.

## The regulated phase

Holding a customer's lira in order to settle a merchant in dollars is a licensed activity in Turkey. No regulator has been approached yet, and the sequencing is deliberate: prove the settlement and verification layers where a mistake costs nothing, then buy the licence that lets the system hold real money. Reversing that order means paying for compliance on a system nobody has yet shown to be correct.

This phase is handled with counsel and is genuinely future work. It is never an excuse for a gap in anything claimed elsewhere on this site.
