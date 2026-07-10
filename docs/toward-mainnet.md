---
sidebar_position: 5
title: Toward mainnet
description: What stands between the proof-of-concept and a system that moves real money.
---

The test network proves that Troia is correct. It cannot prove that Troia is ready to hold someone's money. Four things stand between the two, and none of them is a rewrite: the settlement logic, the defences against double payment, the pricing, and the verification tool all stay exactly as they are. What changes is configuration, three provider implementations, and one careful re-validation of the timing budget against the payment processor's real settlement hold — the figure the sandbox cannot reveal.

## Buying the USDC rather than minting it

Today the pool is refilled automatically, but with test USDC that Troia issues to itself. Production replaces that single step with a genuine purchase on an exchange, funded by the lira the payment processor releases after its settlement hold.

The change is contained on purpose. The decision of when and how much to rebalance is already separate from the execution of the trade, and both interfaces are exercised on every settlement today. What production supplies is one new implementation behind the second of them — and the working capital to stand behind it, which is the part that costs money rather than engineering.

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
