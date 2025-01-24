import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import snapshot from "@snapshot-labs/snapshot.js";

const client = new ApolloClient({
  uri: "https://hub.snapshot.org/graphql",
  cache: new InMemoryCache(),
});

const hub = "https://hub.snapshot.org";
const snapshotClient = new snapshot.Client712(hub);

const spaceName = import.meta.env.VITE_SNAPSHOT_SPACE_NAME;

export const vote = {
  getSpace: async () => {
    const spaceQuery = `
      query {
        space(id: "${spaceName}") {
          admins
          members
          strategies {
            name
            params
          }
          filters{
            minScore
          }
          validation{
            name
            params
          }
        }
      }
    `;

    return await client.query({
      query: gql(spaceQuery),
    });
  },

  getProposals: async (
    first: number,
    skip: number,
    orderBy: string,
    orderDirection: string,
    id?: string,
    state?: string,
    author?: string,
    author_not?: string,
  ) => {
    const proposalsQuery = `
      query {
        proposals(
          first: ${first}, skip: ${skip}, orderBy: "${orderBy}", orderDirection: ${orderDirection},
          where: {space_in: ["${spaceName}"], ${id ? `id: "${id}",` : ``} ${state ? `state: "${state}",` : ``} ${author ? `author: "${author}",` : ``} ${author_not ? `author_not: "${author_not}",` : ``}}
        ) {
          id
          ipfs
          title
          body
          choices
          discussion
          start
          end
          snapshot
          state
          author
          created
          plugins
          network
          type
          strategies {
            name
            params
          }
          space {
            id
            name
          }
          scores_state
          scores
          scores_by_strategy
          scores_total
          votes
        }
      }
    `;
    await client.resetStore();
    return await client.query({
      query: gql(proposalsQuery),
    });
  },

  getVotes: async (
    first: number,
    skip: number,
    orderBy: string,
    orderDirection: string,
    proposal?: string,
  ) => {
    const votesQuery = `
      query {
        votes(
          first: ${first}, skip: ${skip}, orderBy: "${orderBy}", orderDirection: ${orderDirection},
          where: {${proposal ? `proposal: "${proposal}",` : ``}}
        ) {
          id
          ipfs
          voter
          created
          choice
          vp
          vp_by_strategy
        }
      }
    `;

    return await client.query({
      query: gql(votesQuery),
    });
  },

  castVote: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signer: any,
    account: string,
    proposal: string,
    choice: number,
  ) => {
    return await snapshotClient.vote(signer, account, {
      space: spaceName,
      proposal: proposal,
      type: "single-choice",
      reason: "voted via kit-universal-wallet-snapshot-boilerplate",
      choice: choice,
      metadata: JSON.stringify({}),
    });
  },
};
