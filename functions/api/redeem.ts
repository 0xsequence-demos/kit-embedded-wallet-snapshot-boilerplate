import { Session, SessionSettings } from "@0xsequence/auth";
import { findSupportedNetwork, networks } from "@0xsequence/network";
import { ethers } from "ethers";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

interface IEnv {
  PKEY: string; // Private key for EOA wallet
  COIN_CONTRACT_ADDRESS: string; // Deployed ERC1155 or ERC721 contract address
  BUILDER_PROJECT_ACCESS_KEY: string; // From sequence.build
  CHAIN_HANDLE: string; // Standardized chain name – See https://docs.sequence.xyz/multi-chain-support
  sdc_redeem_timers: KVNamespace;
}

const redeemDelayMS = 1000 * 60 * 60 * 24;

function fastResponse(message: string, status = 400) {
  return new Response(message, { status });
}

export const onRequest: PagesFunction<IEnv> = async (ctx) => {
  if (ctx.env.PKEY === undefined || ctx.env.PKEY === "") {
    return fastResponse(
      "Make sure PKEY is configured in your environment",
      500,
    );
  }

  if (
    ctx.env.COIN_CONTRACT_ADDRESS === undefined ||
    ctx.env.COIN_CONTRACT_ADDRESS === ""
  ) {
    return fastResponse(
      "Make sure COIN_CONTRACT_ADDRESS is configured in your environment",
      500,
    );
  }

  if (
    ctx.env.BUILDER_PROJECT_ACCESS_KEY === undefined ||
    ctx.env.BUILDER_PROJECT_ACCESS_KEY === ""
  ) {
    return fastResponse(
      "Make sure PROJECT_ACCESS_KEY is configured in your environment",
      500,
    );
  }

  if (ctx.env.CHAIN_HANDLE === undefined || ctx.env.CHAIN_HANDLE === "") {
    return fastResponse(
      "Make sure CHAIN_HANDLE is configured in your environment",
      500,
    );
  }

  const network = findSupportedNetwork(ctx.env.CHAIN_HANDLE);

  if (network === undefined) {
    return fastResponse("Unsupported network or unknown CHAIN_HANDLE", 500);
  }

  try {
    const [address, signature] = ctx.request.headers
      .get("authorization")
      .split(":") as Array<`0x${string}`>;
    const isValid = await createPublicClient({
      chain: mainnet,
      transport: http(),
    }).verifyMessage({ address, message: "let me in", signature });
    if (!isValid) {
      return fastResponse(
        JSON.stringify({ result: "signature not valid" }),
        401,
      );
    }

    if (ctx.request.method === "GET") {
      try {
        // hacky way to reset timer
        // const fakeFutureUnlock = (Date.now() - redeemDelayMS * 1.5) * 0.001;
        // await ctx.env.sdc_redeem_timers.put(
        //   address,
        //   fakeFutureUnlock.toString(),
        // );

        const timeRemaining =
          (parseInt(await ctx.env.sdc_redeem_timers.get(address)) || -1) -
          Date.now() * 0.001;
        return fastResponse(JSON.stringify({ timeRemaining }), 200);
      } catch (err) {
        // In a production application, you could instead choose to retry your KV
        // read or fall back to a default code path.
        console.error(`KV returned error: ${err}`);
        return new Response(err, { status: 500 });
      }
    } else if (ctx.request.method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (await ctx.request.json()) as any;
      if (body.action === "redeemDaily") {
        try {
          const timeRemaining =
            (parseInt(await ctx.env.sdc_redeem_timers.get(address)) || -1) -
            Date.now() * 0.001;
          if (timeRemaining <= 0) {
            const contractAddress = ctx.env.COIN_CONTRACT_ADDRESS;

            const relayerUrl = `https://${ctx.env.CHAIN_HANDLE}-relayer.sequence.app`;

            // instantiate settings
            const settings: Partial<SessionSettings> = {
              networks: [
                {
                  ...networks[network.chainId],
                  rpcUrl: network.rpcUrl,
                  relayer: {
                    url: relayerUrl,
                    provider: {
                      url: network.rpcUrl,
                    },
                  },
                },
              ],
            };

            // create a single signer sequence wallet session
            const session = await Session.singleSigner({
              settings: settings,
              signer: ctx.env.PKEY,
              projectAccessKey: ctx.env.BUILDER_PROJECT_ACCESS_KEY,
            });

            // get signer
            const signer = session.account.getSigner(network.chainId);
            // create interface from partial abi
            const collectibleInterface = new ethers.Interface([
              "function mint(address to, uint256 amount)",
            ]);
            const data = collectibleInterface.encodeFunctionData("mint", [
              address,
              5000000000000000000n,
            ]);
            const transaction = { status: "unknown", result: "" };
            try {
              const res = await signer.sendTransaction({
                to: contractAddress,
                data,
              });
              transaction.status = "success";
              transaction.result = res.hash;
            } catch (err) {
              console.log(err);
              transaction.status = "error";
              transaction.result = err;
            }

            const futureUnlock = (Date.now() + redeemDelayMS) * 0.001;
            await ctx.env.sdc_redeem_timers.put(
              address,
              futureUnlock.toString(),
            );
            return fastResponse(
              JSON.stringify({
                redeemed: true,
                transaction,
                timeRemaining: redeemDelayMS * 0.001,
              }),
              200,
            );
          } else {
            return fastResponse(
              JSON.stringify({
                redeemed: false,
                timeRemaining,
              }),
              200,
            );
          }
        } catch (err) {
          // In a production application, you could instead choose to retry your KV
          // read or fall back to a default code path.
          console.error(`KV returned error: ${err}`);
          return new Response(err, { status: 500 });
        }
      }
    } else {
      return fastResponse(`Method not supported: ${ctx.request.method}`, 405);
    }
  } catch (err) {
    console.error(`error: ${err}`);
    return fastResponse(err, 500);
  }
};
