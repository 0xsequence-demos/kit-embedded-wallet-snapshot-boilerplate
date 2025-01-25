import { ethers } from "ethers";

import {
  ApolloClient,
  DefaultOptions,
  InMemoryCache,
  gql,
} from "@apollo/client";
import snapshot from "@snapshot-labs/snapshot.js";
import { findSupportedNetwork } from "@0xsequence/network";
import { Wallet } from "ethers";
interface IEnv {
  PKEY: string; // Private key for EOA wallet
  SNAPSHOT_SPACE_NAME: string;
}

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

  try {
    if (ctx.request.method === "GET") {
      const provider = ethers.getDefaultProvider();
      const blockNumber = await provider.getBlockNumber();
      const defaultOptions: DefaultOptions = {
        watchQuery: {
          fetchPolicy: "no-cache",
          errorPolicy: "ignore",
        },
        query: {
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        },
      };
      const client = new ApolloClient({
        uri: "https://hub.snapshot.org/graphql",
        cache: new InMemoryCache(),
        defaultOptions,
      });

      const hub = "https://hub.snapshot.org";
      const snapshotClient = new snapshot.Client712(hub);

      const spaceName = ctx.env.SNAPSHOT_SPACE_NAME;

      const network = findSupportedNetwork("mainnet");

      if (network === undefined) {
        throw new Error("Unsupported network or unknown CHAIN_HANDLE");
      }

      const wallet = new Wallet(ctx.env.PKEY, provider);
      console.log(wallet.address);

      const hackyProvider = {
        _signTypedData: wallet.signTypedData.bind(wallet),
      };

      const proposalsQuery = `
          query {
            proposals(
              first: 10, skip: 0, orderBy: "created", orderDirection: desc,
              where: {space_in: ["${spaceName}"], state: "closed" }
            ) {
              id
              state
            }
          }
        `;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const propsToCancel: any[] = (
        await client.query({
          query: gql(proposalsQuery),
        })
      ).data.proposals;

      console.log(propsToCancel);

      const results = await Promise.all(
        propsToCancel.map((proposal) => {
          console.log("cancel", proposal.id);
          return snapshotClient.cancelProposal(hackyProvider, wallet.address, {
            proposal: proposal.id,
            space: spaceName,
          });
        }),
      );

      console.log(results);

      if (propsToCancel.length > 0) {
        const proposalDefaults = {
          space: "sequence-demos.eth",
          type: "single-choice", // define the voting system
          title: "Test proposal using Snapshot.js",
          body: "This is the content of the proposal",
          choices: ["For", "Against", "Abstain"],
          start: Math.round(Date.now() * 0.001),
          end: Math.round(Date.now() * 0.001) + 60 * 60 * 24,
          network: "1",
          plugins: JSON.stringify({}),
          app: "sequence-demos.eth", // provide the name of your project which is using this snapshot.js integration,
          labels: ["test"],
        };

        const testProposals = [
          {
            title: "Which apple is best, all around?",
            body: "Snacking, baking, juicing, etc.",
            choices: [
              "Golden Delicious",
              "Honey Crisp",
              "Cosmic Crisp",
              "Red Prince",
            ],
          },
          {
            title: "Is this example useful and helpful to you?",
            body: "Try cloning and running it yourself",
            choices: ["Yes", "No", "Undecided"],
          },
        ];
        const receipts = await Promise.all(
          testProposals.map((testProposal) =>
            snapshotClient.proposal(hackyProvider, wallet.address, {
              ...proposalDefaults,
              snapshot: blockNumber - 2,
              ...testProposal,
            }),
          ),
        );
        return fastResponse(JSON.stringify({ result: receipts }), 200);
      }

      return fastResponse(
        JSON.stringify({ result: "no changes at this time." }),
        200,
      );
    } else {
      return fastResponse(`Method not supported: ${ctx.request.method}`, 405);
    }
  } catch (err) {
    console.error(`error: ${err} ${err.stsack}`);
    return fastResponse(err, 500);
  }
};
