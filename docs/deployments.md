---
sidebar_position: 5
title: Deployments
description: Live Stellar testnet contract and account address table.
---

This page is the address book for the live deployment. Everything Troia has put on the Stellar test network — its accounts, its contracts, and the transactions that set them up — is listed here with a link into a public block explorer, so anyone can look up the same records Troia sees. None of it is secret: these are public Stellar addresses, contract identifiers, and transaction hashes. The three signing secrets that control them never appear here; they live only in a local environment file that is kept out of source control.

To read any row, follow its explorer link. A block explorer is a public website that shows the current state of the network, so every balance and every transaction below can be checked independently rather than taken on trust.

:::note Test network addresses are temporary
The test network is periodically reset by its operators, which wipes every address and balance on this page. That is the honest boundary between a payment being *signed* and being *settled*: the signed evidence survives a reset, but the on-chain state does not. See [Reconciliation](./reconciliation.md) for why that distinction matters. A fresh deployment can be produced at any time with a single command, described at the end of this page.
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

## Bootstrap transactions

These four transactions built the deployment, in order: they created the USDC asset contract, deployed the pool, and funded it in two steps to reach its starting balance of 100,000 USDC. Each is verifiable on the explorer.

| Step | Explorer |
|---|---|
| Deploy the USDC asset contract | [tx](https://stellar.expert/explorer/testnet/tx/4c73b7fae52b4850435dff931ad841b1cf51e2453950637091bfc956f71e4adc) |
| Deploy TroyPool | [tx](https://stellar.expert/explorer/testnet/tx/9f66a87bf20c920146c861ac1db3582d99a23243c24a157fdeab2675485c6fe0) |
| Seed the pool with the first 1,000 USDC | [tx](https://stellar.expert/explorer/testnet/tx/03e69a9552ae11dd9cebbf6e5d4fd947d2222f42eb6fc73451e7ea02cdd93609) |
| Top the pool up to 100,000 USDC | [tx](https://stellar.expert/explorer/testnet/tx/5f224b9b0d02ad40b6aa42e8527aa836e0daa95b8d97aa796e77ec06984fc8e4) |

After seeding, the pool reports a balance of 100,000 USDC, an unpaused state, and the administrator and operator addresses listed above — all readable directly from the contract on the explorer.

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

## Reproducing a deployment

A single command regenerates the whole deployment: it creates and funds the three keypairs (once), deploys the USDC asset contract and a fresh pool, mints the pool's starting balance, and writes out the new addresses and secrets to local files that are kept out of source control.

```bash
just fund
```

The deployment targets the Stellar test network, whose passphrase is `Test SDF Network ; September 2015`, and uses USDC with seven decimal places of precision.
