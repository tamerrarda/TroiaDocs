---
sidebar_position: 3
title: Reconciliation
description: The reviewer-verifiable centrepiece — matching each order to its on-chain USDC settlement.
---

Reconciliation is how Troia turns "trust us" into "check for yourself". For every payment, Troia keeps a small bundle of evidence and ships an offline tool that re-derives the outcome from that evidence alone. If Troia's claim about a payment disagrees with what the evidence proves, the tool fails. This page explains what is proven, how the check reaches its verdict, and how a reviewer can run it in a few seconds.

The word reconciliation simply means confirming that two records of the same event agree. Here the two records are what Troia intended to do with a payment and what actually happened to it on the Stellar network — and the whole point is that anyone can confirm the match without access to Troia's servers.

## The honest boundary: signed is not settled

Before anything else, one distinction is stated plainly, because everything below depends on it. There are two separate things a reviewer might want proven, and they hold for different lengths of time.

- What Troia **signed and submitted** is proven by cryptography that lasts forever. A signature over a transaction can be re-checked at any time, long after any web link has rotted or any test network has been wiped.
- What actually **settled on-chain** is proven only while the blockchain still remembers it. If the chain record is gone — a test-network reset, or a transaction that never landed — that proof is gone with it.

The reconciler never blurs the two. An order whose signature checks out but whose chain record has disappeared is reported as unsettled, never quietly counted as a match. Saying "signed" when only "signed" is provable, and refusing to imply "settled", is the core of the honesty here.

## Why this exists

Troia is custodial: a Turkish shopper pays in lira, and Troia pays the merchant in USDC from a pre-funded pool on Stellar. A reviewer's fair question is how they can know a lira was accounted for, and that Troia did not quietly lose or misroute money along the way. The answer is not "read our logs and take our word for it". The answer is a self-verifying record.

For every order, Troia publishes a report that embeds the actual signed transaction it submitted together with what it observed on the chain. A single command re-computes the truth from that embedded evidence, with no network connection and no database access. The reconciler that does this holds no signing key of its own — it can decode and verify signatures, but it can never produce one. Because it cannot sign, it cannot forge the very evidence it checks.

## Three independent records for every payment

The strength of the check comes from keeping three separate records of each payment, drawn from three different places that would have to be corrupted in concert to fool it. A single component lying to itself proves nothing; three independent witnesses agreeing is what makes the result trustworthy.

- **What was intended.** A row in Troia's own database recording the destination, the amount, and the memo that ties the payment to its order. This is the mutable record — it is simply what was requested, and it is the side that could, in principle, be edited or go stale. Whenever the check reports a discrepancy, this is where the "local" value in the comparison comes from.
- **What was signed and submitted.** The exact signed transaction blob Troia sent to the network, together with its transaction hash. This is a frozen cryptographic witness of what Troia actually authorised. Crucially, it is never rebuilt from the database row — so editing that row cannot silently rewrite the signature. The signature either still verifies over the transaction, or it does not.
- **What appeared on the chain.** A normalized snapshot of the settlement as the network recorded it, captured when Troia watched the transaction land. This is a frozen observation of the outside world.

The signed record in the middle is the tiebreaker. When the mutable database row and the observed chain disagree, the signature settles which of them reflects what Troia genuinely committed to.

Two anchors are pinned at the top of the report and always read as plain data, never taken from inside the signed blob they are meant to check: the network passphrase, which is needed to re-compute a transaction's true Stellar hash, and the operator's public key, which is the one signer the check will trust. Fixing the trusted key outside the evidence is what stops a forged signature from nominating its own author. One field carried in the snapshot, the exchange rate that was applied, is deliberately left out of the comparison — its audit source is the accounting ledger, not the reconciler.

## How the check reaches a verdict

The reconciler runs a single ordered decision procedure for each order. The order of the steps is deliberate: it first asks whether the signed witness is authentic at all, and only later asks whether a different transaction settled. Separating those two questions keeps every outcome reachable and, in particular, means the most subtle verdict can only be reached once the signature has already been proven genuine.

Reading in order, for each order the check asks:

1. **Is the signed evidence even a valid payout?** If the blob cannot be decoded, is not a transaction, or is not a call to the pool's pay operation, the witness itself is forged. The verdict is *evidence tampered*.
2. **Does the operator's signature verify?** If the pinned operator's signature over the transaction is missing or invalid, the witness is again *evidence tampered*.
3. **Does the transaction match its own recorded hash?** If re-computing the hash from the blob does not reproduce the hash on file, the two have been separated by tampering — once more, *evidence tampered*.

If all three pass, the signed record is now known to be an authentic, self-consistent operator witness. The check turns from the signature to the chain:

4. **Is there a chain observation at all?** If none was recorded, the payout is proven signed but not proven settled. The verdict is *unsettled*.
5. **Did a different transaction settle?** If the recorded hash does not match the chain's transaction, or the decoded call does not match the chain snapshot, then something other than what Troia signed is what landed. The verdict is *chain divergence* — signed is not settled.
6. **Does the original intent match the chain?** If the database row agrees with what settled, everything lines up end to end. The verdict is *matched*.
7. **Otherwise, the chain is the authority.** The signature and the chain agree with each other, and only Troia's own mutable database row disagrees. The verdict is *corrupt local*.

Each verdict maps to a plain status a reviewer sees: a matched order reads as matched; an unsettled order reads as unsettled; and evidence tampered, chain divergence, and corrupt local all read as a mismatch that demands attention.

:::note
The *corrupt local* verdict is the subtle and important one. It can only be reached after the signature is valid, the hashes are consistent, and the signed transaction matches the chain — so it always carries a valid signature. It means the signed evidence and the blockchain agree with each other, and only Troia's local copy is wrong. In other words, the chain is right and Troia's own records are the corrupt side. That is exactly the failure a careful reviewer should want surfaced, and it is surfaced with the cryptographic evidence fully intact rather than hidden.
:::

## What the sample data shows

A seeded example report ships with the project so the behaviour is concrete rather than described. It contains three orders and one deliberate flaw.

- The first order requests 1.0 USDC, and the intent, the signature, and the chain all agree. It is *matched*.
- The second requests 2.5 USDC, another clean settlement. It is also *matched*.
- The third is the intentional mismatch. Troia's local row claims 0.6 USDC, but the signed transaction and the chain both say 0.5 USDC. The signature is still valid, so the evidence proves the discrepancy lives in Troia's records, not in what actually settled. Its verdict is *corrupt local*, and the comparison records the exact difference between the local and chain amounts.

The summary of the report is therefore three orders total: two matched, one mismatch, none unsettled. The third order is the demonstration piece — proof that a real discrepancy is caught and shown, not smoothed over.

## Verify it yourself

A reviewer does not have to take any of this on faith. Cloning the project and running a single command does the whole check:

```
just verify
```

That builds the reconciler and runs the verifier inside an in-process network blockade. The blockade is loaded before any application code and replaces every outward network path — sockets, DNS, HTTP, and the rest — with a version that refuses to connect and counts every attempt. Before trusting that block, the verifier fires a deliberate test connection and requires it to fail; a block that is merely untriggered is upgraded to a block that is provably armed. Cryptographic functions are left working, so signature and hash checks still run. The result is a positive proof, not a lucky absence of errors: the verdict is computed purely from the embedded data, and the network was demonstrably never reached.

For a run to be accepted, every order in the report must be verified, the recorded number of network attempts must be zero, and every re-derived verdict, status, and the overall summary must equal what the report claimed. On the honest report, the check passes and reports that all three orders were verified with zero network attempts.

### The verifier does not trust the stored verdicts

The verifier deliberately ignores the verdicts and summary written in the report and re-computes each of them from the embedded evidence, then insists the stored values equal what it re-derived. A single disagreement fails the entire report.

A second, tampered copy of the sample report demonstrates the failure mode: it flips the third order's stored verdict to "matched" while leaving the evidence untouched. Run against that copy, the verifier re-derives the true verdict, finds it disagrees with the stored one, and fails — naming the order and the mismatch between the claimed and the recomputed result. A report that lies about its own outcome cannot pass, which is the entire point.

## The other reconciliation: the one Troia does to itself

Everything above describes the artifact a reviewer checks after the fact, offline. The running system also reconciles continuously against the live chain, and it does not trust anything it announced about itself.

One watcher asks whether money left the pool that no order authorised. It reads the token contract's own record of transfers rather than the pool's announcements, because a pool whose code had been replaced could drain itself without announcing anything, while the token contract cannot be persuaded to stay silent. Every payout's identity is written to disk before its transaction is broadcast, so a transaction cannot have landed unless that identity was already recorded. Money that left without a matching record was therefore never authorised — not "not yet noticed", not "still settling". That is why the alarm needs no waiting period to be correct, and why a restart cannot erase the list it checks against.

The other watcher asks whether each order's settlement really happened, and whether it was the one Troia announced. It finds the settlement by the identifier the pool contract itself indexes — derived from the order — rather than by the transaction hash Troia recorded, because looking it up by Troia's own hash would only ask Troia's records to confirm Troia's records. Four things must all hold before an order is called reconciled: the pool's code was never replaced, the amount the pool announced equals the amount the token contract actually moved, the transaction is still on the chain, and the verdict procedure above returns a match. A chain it cannot reach concludes nothing and simply asks again.

The two are complements rather than duplicates. A separate tripwire compares the accounting ledger's idea of the pool balance against the chain's: it is always right about the total but cannot name a transaction. The watcher names it, and pays for that with a limited window into the chain's memory — roughly a week of contract history on the node Troia reads. Where that window falls short, it says it could not see rather than accusing anyone.

Both watchers have now run against the live chain and reconciled a real payout of 80 USDC, finding it by the pool contract's own index. See [Deployments](./deployments.md), which also records what those runs did *not* prove.

## Reset-proof, and honest about the limits

The two kinds of proof age differently, and the reconciler is candid about which is which.

- **The signed parts are self-verifying forever.** Whether a signature is valid and whether a transaction matches its hash are re-computed from the embedded blob, the pinned key, and the passphrase, with no dependency on any live service. A dead explorer link or a wiped test network does not weaken them.
- **The chain observation lasts only as long as the chain's memory.** If the chain record is gone, whether through a test-network reset or a transaction that never landed, the order resolves to *unsettled* — signed proven, settlement not. Troia never claims settlement remains provable after a reset.

:::caution
The transaction in the sample report is a genuine, decodable call to the pool's pay operation, but it is a demonstration artifact with no on-chain footprint — real to verify, but not itself something the network would accept. The live settlement client produces the submittable transaction that actually lands on the test network. The reconciliation model is identical in both cases; only the origin of the transaction differs.
:::

A third command goes further still. It re-verifies a report captured from a payout that genuinely landed on the test network, and does so with the network blocked, so the strongest evidence Troia has is also the evidence a reviewer can check without touching anything:

```bash
just verify-live
```

The bottom line for a reviewer is simple: clone the repository, run the verify command, and watch it pass on the honest report and fail on the tampered one — offline, in seconds, without trusting a word written here. For how reconciliation fits into the wider system, see the [Architecture](./architecture.md) page; for what is deliberately out of scope in the current proof-of-concept, see [Scope & limitations](./scope.md).
