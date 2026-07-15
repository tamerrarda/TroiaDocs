---
sidebar_position: 6
title: Deployments
description: Live Stellar testnet contract and account address table.
---

This page is the address book for the live deployment. Everything Troia has put on the Stellar test network — its accounts, its contracts, and the transactions that set them up — is listed here with a link into a public block explorer, so anyone can look up the same records Troia sees. None of it is secret: these are public Stellar addresses, contract identifiers, and transaction hashes. The three signing secrets that control them never appear here; they live only in a local environment file that is kept out of source control.

The addresses themselves are the opposite of secret, and they are committed to the repository as a record of the one deployment. That is what makes the pool below the same pool for every clone, rather than something each machine invents for itself.

To read any row, follow its explorer link. A block explorer is a public website that shows the current state of the network, so every balance and every transaction below can be checked independently rather than taken on trust.

## One pool, and only one

Troia settles against the single pool contract named below, and nothing in the repository will quietly create a second one. A second pool would orphan this one — its balance, its explorer links, and every reconciliation report that names it — so the everyday command re-points the apps at the recorded pool and proves it is still on the chain, but never deploys anything.

Deploying a pool at all is a separate command, and it is the only one that ever creates one. It runs on exactly one condition: the chain answers, and the recorded pool is provably *not* on it. That happens after a test-network reset, and effectively only then.

The interesting part is what it does when it cannot tell. The two facts a deployment script must never confuse are "the pool is gone" and "I cannot see the pool", and an earlier version confused them: any failed liveness check counted as a reset, so a momentary outage would have been enough to deploy a second pool over a perfectly healthy first one. So the check now answers with exactly one of three words — *live*, *absent*, or *unknown* — and deployment is permitted on **absent** alone. A live pool refuses. A network it cannot reach refuses too, because a guess is not proof. There is no override flag: abandoning a live pool means editing the committed record in a reviewed commit, deliberately.

:::note Test network addresses are temporary
The test network is periodically reset by its operators, which wipes every address and balance on this page. That is the honest boundary between a payment being *signed* and being *settled*: the signed evidence survives a reset, but the on-chain state does not. See [Reconciliation](./reconciliation.md) for why that distinction matters. Recovering from a reset is what the deploy command exists for, and it is described at the end of this page.
:::

## Accounts

Troia uses three ordinary Stellar accounts, each with a public address beginning with `G`. They are kept deliberately separate, even on the test network, so that no single key can do everything: the administrator governs the custody contract (pausing, upgrading, rotating keys), the operator signs each payout, and the issuer holds the authority to mint the test USDC. The reasoning behind this separation is covered in the [Architecture](./architecture.md) page.

| Role | Address | Explorer |
|---|---|---|
| Administrator | `GBNPLKNNSAR6JZRYQLDFJKZ5WY73S42BDDPWVHNLDMNHIQHLZYOJ2QDZ` | [account](https://stellar.expert/explorer/testnet/account/GBNPLKNNSAR6JZRYQLDFJKZ5WY73S42BDDPWVHNLDMNHIQHLZYOJ2QDZ) |
| Operator | `GDMAG4EMNWL6T4IJ6PXGBTBJEWAKFJ2YRKRFRIF7ZM7MG6YFZZU35E4S` | [account](https://stellar.expert/explorer/testnet/account/GDMAG4EMNWL6T4IJ6PXGBTBJEWAKFJ2YRKRFRIF7ZM7MG6YFZZU35E4S) |
| Issuer (USDC) | `GCRAO5VCCWUSHAOJ5LDVGD2T6HSIRBPEU4TDY6XP4GSVTOTO2KZI4N5W` | [account](https://stellar.expert/explorer/testnet/account/GCRAO5VCCWUSHAOJ5LDVGD2T6HSIRBPEU4TDY6XP4GSVTOTO2KZI4N5W) |

## Contracts

Two smart contracts sit at the centre of the deployment, each with an address beginning with `C`. One exposes Troia's self-issued test USDC to Stellar's smart-contract layer; the other is the custody contract that actually holds and moves the money.

| Contract | Address | Explorer |
|---|---|---|
| USDC asset contract | `CCOAUUKWWPSVFZUPIVZECTV3PIVFRTVFKWWF2PQY5Q5CN3JBCDXGNCMB` | [contract](https://stellar.expert/explorer/testnet/contract/CCOAUUKWWPSVFZUPIVZECTV3PIVFRTVFKWWF2PQY5Q5CN3JBCDXGNCMB) |
| TroyPool | `CCVNY6H67XQFOU64EU664HKUCO5M7ZJMJG2NIDSU6BQYRU23IJIATRKZ` | [contract](https://stellar.expert/explorer/testnet/contract/CCVNY6H67XQFOU64EU664HKUCO5M7ZJMJG2NIDSU6BQYRU23IJIATRKZ) |

The **USDC asset contract** is the standard bridge that makes Troia's test USDC usable by Stellar contracts. Its address is derived deterministically from the asset itself, so anyone can recompute it and confirm it points at the issuer account above.

The **TroyPool** is the custody contract — the pooled treasury from which merchants are paid. At deployment it was permanently bound to its administrator, its operator, and the USDC asset contract, left unpaused, and seeded with 100,000 USDC of test funds.

## The demo merchant

| Role | Address | Explorer |
|---|---|---|
| Demo merchant | `GBCUCFGEAJLHYFAZFPJZOSSFLMNXW6TCE4BFFEVMYYJX7LIMRYAMNYAE` | [account](https://stellar.expert/explorer/testnet/account/GBCUCFGEAJLHYFAZFPJZOSSFLMNXW6TCE4BFFEVMYYJX7LIMRYAMNYAE) |

This is the account the demonstration storefront pays today. It is deliberately *not* part of the deployment: an ordinary test-network account with a USDC trustline, swappable without touching the pool. The two full-stack runs recorded further down predate it and paid the previous demo merchant, `GA4WBDAN…`, retired on 10 July 2026.

## Bootstrap transactions

These four transactions built the deployment, in order: they created the USDC asset contract, deployed the pool, and funded it in two steps to reach its starting balance of 100,000 USDC. Each is verifiable on the explorer.

| Step | Explorer |
|---|---|
| Deploy the USDC asset contract | [tx](https://stellar.expert/explorer/testnet/tx/4c73b7fae52b4850435dff931ad841b1cf51e2453950637091bfc956f71e4adc) |
| Deploy TroyPool | [tx](https://stellar.expert/explorer/testnet/tx/9f66a87bf20c920146c861ac1db3582d99a23243c24a157fdeab2675485c6fe0) |
| Seed the pool with the first 1,000 USDC | [tx](https://stellar.expert/explorer/testnet/tx/03e69a9552ae11dd9cebbf6e5d4fd947d2222f42eb6fc73451e7ea02cdd93609) |
| Top the pool up to 100,000 USDC | [tx](https://stellar.expert/explorer/testnet/tx/5f224b9b0d02ad40b6aa42e8527aa836e0daa95b8d97aa796e77ec06984fc8e4) |

The two funding steps are a one-off of this particular deployment's history. The deploy command now mints the whole starting balance in a single transaction, so a fresh deployment produces one funding transaction rather than this pair.

Immediately after seeding, the pool held 100,000 USDC. That figure is a starting point rather than a standing one: every payout lowers it and every automatic refill raises it, so the balance the explorer shows today will not be 100,000 and is not meant to be. What does still read straight off the contract, and should be checked, is that the pool is unpaused and that its administrator and operator are the addresses listed above.

## A real payout, verified on-chain

To prove the money path works end to end, the operator signed a single genuine payout that moved USDC from the pool to a merchant, using an on-chain identity derived from a real order. A short explanation of each field precedes the evidence, so the table can be checked rather than trusted.

The order paid was a one-USDC test order. The merchant was a fresh Stellar account that first established a trustline — the on-chain permission an account must add before it can hold a given asset ([trustline transaction](https://stellar.expert/explorer/testnet/tx/d2b120f2f258f35474a3f08704639c381136a973215af114cdefbc82c59bbd49)).

Two identifiers were derived deterministically from the order before anything was submitted. The memo is the tag that ties an on-chain transfer back to its order; the transaction identity is what pins the payout to a single, non-repeatable slot on the network. Both are reproducible byte for byte from the order alone, as described in the [Architecture](./architecture.md) page:

- Memo: `6115721c3f246433a851a959ba9b0bc8c3de9bc486f5da2cdd0f022bad30c5a9`
- Transaction identity: `fdce630a4557f4bb37a6d7c1d3e011f0749b1f2e0de54be336e8d4ee789876cf`

The payout itself, and its effects, are all on the explorer:

| Check | Result |
|---|---|
| Operator-signed payout | [transaction](https://stellar.expert/explorer/testnet/tx/5a3d60cc25fc82025560d1c13b74f63b619393e194ada43cc6b8317637d64f13), carrying the derived memo |
| Pool balance | Fell from 100,000 to 99,999 USDC |
| Merchant balance | Rose from 0 to 1 USDC |
| Replay guard | The pool now records this order as already paid |
| Double-pay shield | A second payout for the same order is rejected on-chain, and the pool balance is unchanged |

That final row is the on-chain half of Troia's guarantee against paying a merchant twice. The operator's sequence number is the primary shield — the network accepts a given payout slot only once — and the contract's own record of paid orders is the backstop. The irreversible USDC leg can never pay one order twice.

This same payout was also captured as offline evidence and re-verified with no network access at all: the recorded proof re-derives the outcome and confirms it matched what was intended. That evidence is reset-proof, because the operator's signature over the real transaction hash is embedded and cannot be forged; it still verifies after a test-network reset, even though the live settlement it points to only exists while the chain remembers it. See [Reconciliation](./reconciliation.md) for how this works.

## The whole system, driven live

The payout above was signed by hand to prove the on-chain leg in isolation. Two later runs drove the entire system: the demonstration storefront showed a payment request, the browser extension recognised it and opened iyzico's hosted form, a real Troy sandbox card paid the lira, and — only after that charge confirmed — the backend submitted the irreversible payout on its own. No step was hand-run.

The first of these settled 74 USDC ([transaction](https://stellar.expert/explorer/testnet/tx/cd643d7178c6d6068aabe236af45e68fba60d9062d1ff71a85c5af75dfb08ded)), paid to the demo merchant of the time. The second, on 10 July 2026, is the more interesting one, because it also exercised the crash-durable records and both chain watchers.

| Check | Result |
|---|---|
| The shopper paid | 4,019.46 lira, on iyzico's hosted form with a Troy sandbox card |
| The merchant was settled | 80 USDC ([transaction](https://stellar.expert/explorer/testnet/tx/d47f7fb92a149d61a6f576aa7f803d75e6d3b3dcb6b0119e5a12a7387683d1a5)) |
| The audit found the settlement independently | By the identifier the pool contract itself indexes, derived from the order — not by the transaction hash Troia recorded |
| The five checks before "reconciled" | The settlement was found under the order's own identifier; the pool's code was never replaced; the amount announced equalled the amount the token contract moved; the transaction was still on the chain; the offline verification model agreed |
| The books matched the chain | The accounting ledger and the pool's on-chain balance agreed to the last unit |
| The pool grew by the commission | It paid out 80 USDC and was refilled with 85.81, from the lira that same order collected |

The system was then killed and restarted against the same stored records. Nothing was re-booked, re-minted, or re-advanced. Troia's own payout was still recognised as one it had authorised, even though everything held in memory — including the list of orders — had been erased. No alarm was raised.

The run also surfaced a real defect, which is why running it was worth it: after the restart, asking for the order's status returned "not found", because the orders themselves live in memory. A settled order now answers from the durable settlement record instead, with its real transaction hash. An order still in flight is still an honest "not found" — see [Scope & limitations](./scope.md).

## A payout that reverted, read on chain

Some of Troia's handling can only be confirmed against a transaction that genuinely failed on the chain, because no stand-in has the right shape. One such path is the diagnostic that tells Troia *why* a payout was rejected, which it reads out of the failed transaction's own error detail. It was confirmed on 14 July 2026.

Staging it is harder than it sounds. A duplicate payout cannot produce a reverted transaction: the network simulates it first, sees it will fail, and never submits it. So the pool was paused, and a payout that had already been signed was sent anyway — the pool checks whether it is paused before it moves any money, so the transaction landed, [reverted](https://stellar.expert/explorer/testnet/tx/249862edac65d4a006d56a8825ade62ae8b7486c6a282fcdfaad3f9745d0f134), and Troia read back the exact reason: *paused*. No USDC moved, the order was not marked as paid, and the pool's balance was byte-for-byte identical before and after. The pool was unpaused immediately.

## A thief, caught

The sharpest claim the outflow watcher makes is not that it leaves honest payouts alone — it is that USDC leaving the pool through a transaction Troia never authorised will be caught. That was demonstrated on the chain on 14 July 2026, against a running backend, in an isolated working directory so that the real deployment's own history stayed clean.

The payout was made deliberately by hand, straight to the contract, bypassing Troia's backend entirely — so its transaction hash was never written to the list of payouts Troia authorises before broadcasting them. Within the grace window, the watcher paged, unprompted:

> ROGUE PAYOUT: 10000000 stroops of USDC left the pool … which this operator never authorised — its hash was never written to the pre-broadcast journal.

It recorded the case permanently: first as a sighting, then as an accusation, both keyed to the [transaction](https://stellar.expert/explorer/testnet/tx/d946c02ea7f69e93160d9e631ceda88e7bb17a262c24f8a22c81b162a0e8c78f). The issuer then minted the missing unit back, so the pool ended exactly where it started — and the accusation stayed on the record anyway. A balance can be made whole; the ledger of unauthorised outflows never forgets one. Throughout, the real deployment's own suspect log remained empty.

:::note What the live runs still have not proven
Two things remain exercised by tests alone: the verdict for a *different* transaction settling an order, and the watcher's two "we could not see" states, which distinguish a blind spot from an accusation. One further caveat about the 10 July run: alarms are printed to the server's log rather than saved, so unlike everything in the table above, "no alarm was raised" is an observation from that run rather than something a reader can re-derive from the repository. All of this is listed on [Scope & limitations](./scope.md).
:::

## Working against this deployment

One command points everything at the pool above. It proves the pool is still on the chain, tops the keys up with the small amount of XLM they need for transaction fees, and re-points the storefront and the extension at it. It deploys nothing and mints nothing.

```bash
just fund
```

## Deploying a pool — first time, or after a reset

The other command is the only one that ever creates a pool, and it refuses unless the chain proves the recorded one is gone. A live pool refuses; a network it cannot see refuses too.

```bash
just bootstrap
```

It generates and funds the three keypairs the first time, deploys the USDC asset contract and the pool, mints the starting balance in a single transaction, and rewrites the deployment record — which is committed, so a run of this command means the table on this page is stale and must be rewritten. The secrets it writes stay in a local file that is never committed.

The deployment targets the Stellar test network, whose passphrase is `Test SDF Network ; September 2015`, and uses USDC with seven decimal places of precision.
