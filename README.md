# nexusdex-interface

A DEX swap interface built with React. Personal project exploring custom AMM UI patterns outside of the standard Uniswap fork approach.

## Features

- **Token selector** — searchable modal with balances for all supported tokens
- **Custom AMM pricing** — dynamic fee curve based on trade size relative to pool depth (not a standard x·y=k implementation)
- **Wallet connect flow** — disconnected → connecting → connected states with address display
- **Transaction lifecycle** — full pending → confirmed → failed flow with tx hash
- **Slippage controls** — preset options + custom input, minimum received calculated per trade
- **Price impact indicator** — color-coded warning based on trade size
- **Token flip** — swap input/output tokens while preserving amounts

## Stack

- React + Hooks
- TypeScript-compatible
- CSS-in-JS (inline styles, no dependencies)

## Getting Started

```bash
npm install
npm run dev
```

## Notes

Currently uses mocked pricing and balances. Designed to be wired up to real contract calls via `wagmi` + `viem` — the wallet and transaction state structure mirrors how a real integration would work.
