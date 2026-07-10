# Troia Documentation

**Live site: [https://troiadocs.vercel.app](https://troiadocs.vercel.app)**

The source for the Troia documentation site, built with [Docusaurus](https://docusaurus.io/). It covers the overview, architecture, reconciliation, scope and limitations, what stands between the proof-of-concept and mainnet, deployments, the live-smoke runbook, and the demo script.

Troia is a custodial TRY→USDC settlement bridge on Stellar: a Turkish shopper pays in lira with a Troy card, and the merchant is settled in USDC from a pre-funded pool.

## Local development

```bash
npm install
npm start
```

`npm start` runs a local dev server with hot reload. `npm run build` produces the static site in `build/`.

## Deployment

Every push to `main` auto-deploys to Vercel at [troiadocs.vercel.app](https://troiadocs.vercel.app).
