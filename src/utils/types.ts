import { Proposal } from "@snapshot-labs/snapshot.js/dist/src/sign/types";

export type AdjustedProposal = Proposal & { id: string; scores: number[] };
