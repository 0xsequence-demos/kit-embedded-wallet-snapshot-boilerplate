# Sequence Kit Embedded Wallet React Starter Boilerplate

Starter Sequence Embedded Wallet boilerplate that uses [Sequence Kit](https://github.com/0xsequence/kit) with Snapshot.

This demo lets you:
1. Mint demo coins from a cloudflare pages function (5 coins per 24 hours)
2. Vote on daily demo proposals, with voting power proportional to your demo coins balance


> [!IMPORTANT]
> Sequence and this demo use ethers v6, while snapshot.js uses ethers v5. As a result, we pass fake patched providers to bridge the incompatibility. 

> [!WARNING]
> This demo uses a modified version of snapshot.js, which has had the schema validation provided by AJV, removed. This is due to AJV using "new Function(...)" which is prohibited in cloudflare workers for security reasons.

## Getting started

```js
pnpm install
```
You can run `cp example.wranger.toml wrangler.toml` to start with a template wrangler file, to configure pages functions.

To develop the front-end with hot-module-reloading, use vite:
```
pnpm dev:vite
```

To develop and test the cloudflare functions
```
pnpm dev:cf
```
This will build and watch the front-end, but expect delays. This is primarily to develop and test cloudflare functions with wrangler.

The app will run at [localhost:4444](http://localhost:4444)

## Customizing this demo

To provide your own keys from [Sequence Builder](https://sequence.build/), simply edit the `.env` and `wrangler.toml` files accordingly.

You will need an ENS to create a space on [Snapshot](https://snapshot.box/#/home).

In order to test Snapshot's voting power, you can deploy your own Test Coin contract, and update the `.env` and `wrangler.toml` files accordingly. 

It's also important to provide your own PKEY in wrangler.toml. This is a private key with multiple important uses:

1. its public address should be made into an author in your Snapshot space's settings.
2. it should be added as a private key in your project's Transaction API, and be given minting permission on your coin contract. You will also need to sponsor this address to pay for gas fees, on non-testnets.

## Proposals maintained by this demo

According to Snapshot's design, a user's voting power will be decided at the start of a proposal. 

This makes demonstrating Snapshot a little tricky, because buying coins does not immediately increase your voting power.

As unintuitive or frustrating that might be, it's designed to combat various governance abuses, which we won't get into here.

But to make this demo interactive, we've included a [cloudflare function](./functions/api/auto-maintain-snapshot.ts) that cancels closed proposals and starts new ones, once a day. We trigger this function via a cloudflare worker cronjob.