---
sidebar_position: 7
title: Live-smoke run
description: Runbook for driving a real Troy-card charge into a real on-chain payout.
---

:::note Executed
This run has been driven twice, end to end. A real Troy sandbox card charge automatically drove a real on-chain payout; the second run also exercised the crash-durable records and both chain watchers, and survived a deliberate restart. The evidence is on the [Deployments](./deployments.md) page. This page remains the runbook for reproducing it.
:::

This page is a runbook. It walks an operator through the whole of Troia end to end on the test network: a genuine card charge on one side, driving a genuine payout on Stellar on the other, with nothing faked in between. Follow the steps in order and you will watch a single payment travel the full length of the system.

Everything the run touches is real except the value. The card charge goes through iyzico's sandbox with valueless test cards, and the USDC being paid out is Troia's own test-network mint. No real money moves at any point. What the run proves is that the network-facing halves of the system — the ones that talk to a live blockchain and a live payment processor — actually work when connected to the real thing, rather than only against the stand-ins used in offline testing.

:::note The honest boundary
Signing and settlement are two different facts, and this run keeps them separate. Troia can prove cryptographically what it *signed*, and it can prove what *settled* for as long as the chain remembers the transaction. It never conflates the two: a signed transaction is not yet a settled one.
:::

## What a live run proves that offline testing cannot

Offline, the network-facing code is type-checked and exercised against fakes. That catches shape and logic errors but never touches a real endpoint. A live run is the first time these paths meet a real Stellar RPC node and the real iyzico sandbox, so it is the first place the following can be confirmed:

- **The Stellar adapters.** Reading the pool's balance, submitting a payout and polling for its result, and loading the destination merchant's trustline — the standing permission an account needs before it can hold a given asset — all against a live node.
- **The iyzico client.** A real hosted payment form, a real webhook, and a real signed callback from the processor.
- **The live pricing inputs.** Troia's exchange rate comes from an oracle — a small set of independent public price sources combined into one trusted number. This run drives the real spot mid from the major exchanges and the daily-close history, each now behind a per-attempt timeout and a bounded retry, so a hung source fails safely and a momentary blip is retried rather than fatal.
- **The reverted-payout diagnostics (optional).** Whether a payout that lands on-chain but reverts carries the diagnostic detail Troia reads to classify the failure. Only a genuinely reverted transaction can confirm this, which is why it has its own optional step at the end.

## Prerequisites

Before starting, make sure the following are in place:

- **The toolchain** listed on [the Overview](/): Node 22, pnpm, Rust with the `wasm32v1-none` target, the Stellar CLI at version 26.0.0, and `just`.
- **An iyzico sandbox account.** Register free at `sandbox-merchant.iyzipay.com`, then copy the account's API key and secret into `.env` as `IYZICO_API_KEY` and `IYZICO_SECRET_KEY`. No dashboard webhook needs configuring for this run: settlement is driven by Troia's own poll worker pulling the sale's status on an authenticated schedule, not by a server-to-server notification from iyzico.
- **A public tunnel — only if the browser and the backend are on different machines.** When they share a machine, the usual local case, no tunnel is needed: the sandbox accepts a plain `http://localhost:3000/return` as the page it returns the customer's browser to (this was measured, not assumed). If the browser is elsewhere, put a public HTTPS tunnel in front of the backend — `cloudflared`, `ngrok`, or any HTTPS reverse tunnel — and give iyzico that address instead. Step 3 covers both.
- **The issuer key.** Starting the backend now also requires `TROIA_ISSUER_SECRET`, the key that signs the automatic top-up which returns collected lira to the pool as USDC. It is deliberately separate from the operator key that signs payouts, and the boot fails closed without it.
- **A filled-in `.env`**, copied from `.env.example` and completed with the secrets listed there. Both `.env` and `deployment.testnet.json` are excluded from source control.

## Step 1 — Point at the rails

Troia settles against the one deployed pool recorded in the repository. With that record present and the matching secrets in `.env`, point the running apps at it:

```bash
just fund
```

This proves the recorded pool is still on the chain, tops the keys up with the small amount of XLM they need for fees, and re-points the storefront and the extension at it. It never deploys a pool and never mints — and it refuses if the record is missing, because it is not the command that creates one.

Creating a pool is a separate command, needed only for the very first deployment or after a test-network reset has erased the contract:

```bash
just bootstrap
```

It generates and funds the three keypairs the first time, deploys the USDC asset contract and the pool, mints the starting balance, and rewrites the deployment record. It refuses while a live pool is already recorded, because a second pool would orphan the first. See [Deployments](./deployments.md) for the full rule. After it runs, rebuild the extension so its compiled-in configuration matches the fresh deployment.

## Step 2 — Preflight

Before driving any payment, confirm every live dependency is reachable and healthy. Preflight checks each one in isolation and prints a plain green-or-red report.

```bash
just preflight
```

It verifies that the operator key matches the deployment and holds enough XLM to pay transaction fees, that the issuer key also matches the deployment and holds XLM of its own — the automatic refill's mint is signed by the issuer and pays its own fees — that the pool actually holds USDC, that the exchange oracle returns a spot rate, that the price-history source returns daily closes, and that iyzico is reachable with your credentials — the last of these a no-charge probe that creates no checkout form.

:::caution
An exit code of 0 means ready; 1 means something is red. Do not proceed until preflight is green.
:::

## Step 3 — Set the callback URL

After payment, iyzico redirects the customer's browser to a return page. This return page is only where the browser lands; the actual settlement happens separately, through the poll worker's server-side pull, so this URL is a landing page and nothing more.

If the browser runs on the same machine as the backend — the usual local case — point it straight at localhost. The sandbox accepts this, so no tunnel is needed:

```
TROIA_CALLBACK_URL=http://localhost:3000/return
```

If the browser is on a different machine, open a public tunnel to the backend in a dedicated terminal and use its HTTPS URL instead — both proven runs did this:

```bash
cloudflared tunnel --url http://localhost:3000
```

```
TROIA_CALLBACK_URL=https://<your-tunnel>.trycloudflare.com/return
```

## Step 4 — Start the backend

Bring up the backend. On boot it reads `.env` and `deployment.testnet.json`, opens the append-only files it will record to, books the pool's opening balance into the accounting ledger, seeds its view of the pool balance and the operator's sequence number directly from the chain with two live reads, starts the Fastify server, and launches five background loops: the poll-and-recovery worker, the automatic top-up that returns collected lira to the pool, the tripwire that compares the books against the chain, and the two watchers that read the chain for unauthorised outflows and for settlements to reconcile. A bad configuration value fails the boot outright rather than degrading silently. Leave it running.

```bash
just serve
```

## Step 5 — Drive one real charge

Now create a single payment. The demonstration storefront and the browser extension are the primary driver — together they drove both proven runs — and the helper script below is the headless alternative for a run without a browser: it ensures a demo merchant with a USDC trustline exists, derives the order's memo — the identifier that ties an on-chain transfer back to its order — exactly as the backend would, and submits the payment intent.

```bash
node scripts/intent.mjs
```

By default this creates an order for 1 USDC with a generated order id; you can pass your own, for example `node scripts/intent.mjs my-order 2` for a 2 USDC order. The script prints the price the server computed — the client cannot dictate it — and writes a `demo/checkout.html` file. Open that file in a browser and pay with a Troy sandbox test card. iyzico publishes its test card numbers; the mock one-time password for the 3-D Secure step is `123456`.

## Step 6 — Watch it settle

There are three vantage points on the payment as it completes.

The **coarse status endpoint** reports where the order stands, without ever exposing the crypto leg directly:

```bash
curl -s http://localhost:3000/status/<orderId>
```

It moves from pending to processing to completed. After the customer pays, their browser lands on the return page, and the poll-and-recovery worker — running on a fixed interval — re-retrieves the sale by its token and drives the USDC leg. Settlement is this authenticated pull, not the browser redirect.

The **backend logs** show the same story from the inside: the money-first advance through the order's states and the payout submission as the worker picks the order up.

The **block explorer** shows the on-chain truth: the pool balance falls by the paid amount, the merchant receives the USDC, and the payment event carries the derived transaction identifier and memo. The [Deployments](./deployments.md) page lists the addresses to look up.

## Step 7 — Confirm the reverted-payout diagnostics (done on chain; reproducible)

A payout that reverts on-chain carries a diagnostic detail Troia reads to classify *why* it failed, and only a genuinely reverted transaction has the right shape to confirm that read. This was confirmed on the chain on 14 July 2026 (see [Deployments](./deployments.md)); the steps below reproduce it.

Landing a reverted payout is less obvious than it looks. A duplicate payout will *not* produce one: a payout that is bound to fail is caught in simulation, so the network never submits it and no reverted transaction is ever created. The way to land a real revert is to change the pool's state between simulation and inclusion — pause the pool (which the payout checks first, before it moves any money, so nothing is transferred and the books are untouched) and send a payout that was signed beforehand. It lands, and reverts with reason *paused*:

```bash
node --env-file=.env scripts/stage-revert.mjs   # pauses, sends the pre-signed pay(), prints the reverted tx hash
node scripts/probe-revert.mjs <that hash>
```

Expect it to print the paused error code — any non-empty code confirms the read. If instead it reports nothing while the transaction shows as failed with diagnostics attached, the events are likely sitting on a different contract or nested elsewhere in the transaction metadata, and the diagnostic collector is where to look. Either way the money path is safe: an unreadable diagnostic simply causes a safe re-drive, and the pool contract's own record of which orders it has already paid is the real defence against paying twice. The staging script unpauses the pool on every exit path.

## Known limitations

None of these block the run; each is a deliberate, honest boundary of a proof-of-concept, and each fails on the safe side. The [Scope & limitations](./scope.md) page covers them in full.

- **The orders are single-process; the money facts are not.** Seven append-only files survive a restart — the accounting ledger, the settlement evidence, the record of every authorised payout, what the chain was observed to say, which orders are reconciled, and the payout watcher's place. The orders themselves, the pool reservations, and the operator's counter do not, so a payout that was submitted but has not yet landed is forgotten. That fails safe: the contract's own record of paid orders and the single-use counter each cap delivery at one payout per order. A settled order still answers correctly after a restart, from the durable evidence. See [Scope & limitations](./scope.md).
- **The pricing oracle requires all its sources.** If an exchange is unreachable, the quote fails closed and is retried — the money-safe default. A brief wobble is absorbed by the bounded retry; a sustained outage means pausing rather than guessing a price.
- **The same-day void path is not part of the happy path.** The reversal that returns a shopper's money is only exercised when a charge succeeds but the USDC leg cannot settle, so a clean end-to-end run does not touch it.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| The backend throws on boot | A missing or blank environment variable, or the operator secret does not match the deployment's operator. Run `just preflight`. |
| The intent request is refused for insufficient pool funds | The pool cannot cover the amount. Reduce it, or mint more USDC into the pool with the issuer key (`just fund` does not mint). |
| The intent request reports no available price | The live oracle or history source is down. Re-run `just preflight` to see which one. |
| The browser shows an error after paying | The tunnel is down, or `TROIA_CALLBACK_URL` is stale or not pointing at `/return`. Settlement still proceeds via the poll worker regardless. |
| The charge succeeds but no payout appears | Check the backend logs. The poll worker re-retrieves the sale by token on each interval; an uncertain charge is re-driven, a declined one fails cleanly. |
