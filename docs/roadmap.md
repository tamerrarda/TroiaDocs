---
sidebar_position: 8
title: Roadmap
description: The phased plan from testnet PoC toward a mainnet system.
---

This page lays out how Troia is being built and where it is going. Today it is a working proof-of-concept on Stellar's test network; the goal is a production settlement bridge that moves real money. The path between the two is deliberate and sequenced, and this page describes it honestly: what already works, what comes next, and what is being left for the regulated production phase on purpose.

The guiding idea is to build **inside-out**. The parts that carry the most risk are built and proven first, in isolation, before anything touches a real network or a real card. The money core and the reviewer-verifiable reconciler come first, tested against fixed example data. Only then are the real payment rails wired in. The storefront and browser extension — the visible surface — come last, because they demonstrate the system rather than prove it is safe. Every step is small, and nothing is considered finished until it can be shown to work.

## Foundations

Before any code that touches money, the project needed a workspace that builds cleanly and enforces its own safety rules. This first milestone established the monorepo, pinned the exact toolchain versions everyone uses, and set up automated formatting, linting, and testing so that nothing merges without a passing test.

Two safety rails were put in place here rather than bolted on later. The first is a single configuration package that owns everything network-specific — addresses, endpoints, and identifiers — enforced by a check that fails the build if such a value ever appears elsewhere. The second is a strict secret boundary: every credential lives only in local environment files, never in source control, with placeholders documented so a new environment can be set up without ever seeing a real key. Moving from test to production is therefore a change of configuration, not a change of code.

## The money core, proven offline

This is where the design earns its keep. The heart of Troia is a set of pure, deterministic components that decide what a payment *should* do, with no network and no payment processor involved. Because they are self-contained, they can be tested exhaustively offline, and a whole category of money-losing behaviour can be ruled out before a single real transaction exists.

The core covers:

- **Deriving one identity for a payment.** A single order identifier is turned, by one deterministic function, into the payment memo, the on-chain transaction identity, and the key that prevents double-processing. The acceptance test is byte-for-byte agreement between two independent implementations, so no two components can ever disagree about which order they are handling.
- **Building a payout safely.** A payout is constructed only when its destination, memo, and trustline are all valid; anything invalid is rejected before the shopper is ever charged. The rejection order is fixed and tested, so the same bad input always fails the same way.
- **Allocating sequence numbers.** Each payout is pinned to a specific Stellar sequence number — the counter the network uses to accept a given transaction only once. The allocator is the single writer of these numbers and is idempotent per order, so the same order always maps to the same sequence number.
- **The payment lifecycle as a state machine.** Every order moves through a fixed set of states, and only the explicitly listed transitions are permitted. Property tests confirm that no unlisted state is ever reachable, that intent is always written down before an irreversible action, and that a payout which never took effect is treated very differently from one that did.
- **Pricing and the exchange rate.** The lira price is assembled server-side from the median of several market quotes, with outlier rejection and a fail-closed rule when too few sources agree. All of this math is tested against fixed quotes before any live market data is connected.
- **The accounting ledger.** Every payment writes balanced, append-only double-entry records, so the books can always be reconciled against the on-chain balance.

A final composition step threads one successful order through the entire core, module to module, and confirms a tampered memo is stopped at the build stage. Each part is unit-tested in isolation; this proves they also work together.

## The settlement contract

:::note Completed
The Soroban contract that holds and releases the pooled USDC is built and fully tested.
:::

The pool is a smart contract on Stellar that holds the custodial USDC and pays a merchant only when instructed by the operator. Its payout function performs a single atomic check-and-transfer: it verifies the pool has enough balance, records that this exact payment has been handled, and only then moves the funds — recording the payment *before* transferring it, so a replay can never pay twice. A duplicate attempt for the same payment is rejected outright. The contract can also be paused in an emergency.

Administrative actions — changing the operator, changing the administrator, or upgrading the contract — are all gated behind the administrator's authorisation and emit an audit event. Administrator handover is intentionally single-step on the test network, where the contract can simply be redeployed; the stronger protection of multisig and a timelock is planned for production rather than built into the contract now.

The test suite covers every error path, confirms each one genuinely reverts rather than silently doing nothing, and includes a conservation check that runs hundreds of randomly interleaved payments and verifies that the total value in the system never changes and no payment is ever settled twice. That the check has real teeth was demonstrated by deliberately disabling the replay guard and watching it fail.

## The reconciler and evidence

:::note Completed
The offline reconciler and its evidence format are built and verifying on the fixture set.
:::

Reconciliation is how Troia turns "trust us" into "verify it yourself", and it was built early — on fixed example transactions — so that it stands on its own before real payouts exist. For every payment, three independent records are kept: what was intended, what was signed and submitted, and what actually appeared on the blockchain. The signed record is stored exactly as produced and never recomputed, so it cannot be quietly rewritten to match.

An offline tool re-derives the outcome from these records and checks that they agree. It confirms the transaction hash is internally consistent, that the signature was made by the pinned operator key, and that the transaction is bound to the correct network. Its verdict distinguishes tampering from a genuine divergence, and it produces a self-contained report that a reviewer can check with no access to Troia's systems.

The verification runs with the network physically blocked: any attempt to reach out would throw immediately, and the run is proven to make zero network calls. On a seeded set of example orders it correctly reports the matched, mismatched, and unsettled counts, catches a record that was tampered with locally even though its signature is valid, and changes its exit result the moment any part of the report is altered. This is important enough to have its own page; see [Reconciliation](./reconciliation.md).

## Connecting the real rails

With the core and the reconciler proven, this milestone connects Troia to the outside world one provider at a time, each behind a swappable interface. Most of it is done; the final piece is the first fully live run.

What is in place:

- **The Stellar client.** Builds each payout transaction deterministically, submits it, polls for the result, and reads the account state the core needs. It also includes the checks that decide, from the blockchain itself, whether a delayed payout can no longer take effect.
- **The payment processor adapter.** Wraps the iyzico sandbox for the full card lifecycle — presenting the hosted payment form, retrieving its result, and cancelling or refunding a sale — and classifies every result as success, definite failure, or unknown, so an uncertain outcome never triggers a payout.
- **The backend orchestration.** A service that drives the state machine against these real calls, persists intent before acting, verifies incoming webhooks before trusting them, and includes a recovery worker that observes what already happened before deciding anything after a restart.
- **The pool and its funding.** The live test-network rails are deployed — the operator, administrator, and issuer keys, the USDC asset, and a seeded pool contract — and a real on-chain payout has been proven end to end: the pool balance decremented correctly, the replay guard held, and a double-pay attempt reverted. The details are recorded on the [Deployments](./deployments.md) page. Refilling the pool is available but still manual; automatic rebalancing is deferred to production.
- **Calibration, pricing, and composition.** The result classifier has been calibrated against the live sandbox using real charges and declining test cards; the pricing model now includes the payment processor's fee and the real settlement hold of roughly three weeks; and the real adapters compose cleanly offline into a bootable application. Every network-facing call carries a per-attempt timeout and bounded retry, so a slow or hung dependency fails closed rather than freezing a checkout. A readiness preflight smoke-tests each external dependency in isolation before a live run.

:::tip What remains
The one open item is the fully live run: standing the service up behind a public webhook tunnel and driving a real card charge through to a real on-chain payout, exercising the network adapters against live infrastructure for the first time. The [Live-smoke run](./live-smoke.md) page tracks this.
:::

## Storefront and browser extension

The last milestone builds the visible surface — deliberately last, because it showcases the system rather than proving it. It comprises a demo merchant storefront that emits a standard Stellar payment request, and a thin browser extension that recognises a supported checkout and offers to pay with a Troy card. The extension holds no keys, signs nothing, and always falls back to a manual option. Rounding it out is a proof package: the reference documentation, a deterministic multi-order demo run, and a short video walking through the whole flow.

## Deliberately deferred to production

Several capabilities are intentionally out of scope for the proof-of-concept. In each case the boundary — the interface the rest of the system talks to — already exists, so adding the real implementation later is a contained change rather than a redesign.

- **Real exchange rebalancing.** On the test network, refilling the pool is simulated by minting test USDC. In production it becomes a genuine purchase on an exchange, behind the same interface.
- **KYC.** The identity-verification boundary is defined now and is a no-op on the test network.
- **Hardware-backed keys and true multisig.** Signing goes through a boundary that today uses a single key; production raises the signing threshold and moves keys into secure hardware without changing the flow.
- **Concurrent payouts.** Payouts are processed one at a time by design, which keeps the double-payment guarantee simple. The seam for handling many in parallel — using separate sequence-number sources — is already in place for a later step.
- **Additional wallet and checkout integrations.** Further extension adapters are a bonus, built on the classic-payment settlement path.
- **Mainnet.** Going live with real money is treated as a separate, regulated phase with its own compliance obligations — not a switch to flip.

For the reasoning behind these boundaries, the [Scope & limitations](./scope.md) page goes deeper, and the [Architecture](/) page explains the guarantees that hold across every phase.
