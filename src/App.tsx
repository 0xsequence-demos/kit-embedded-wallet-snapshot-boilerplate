import { SequenceKit } from "@0xsequence/kit";
import { config } from "./config";
import "@0xsequence/design-system/styles.css";

import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { NotConnected } from "./views/NotConnected";
import { Connected } from "./views/Connected";
import { Button, Group, SequenceBoilerplate } from "boilerplate-design-system";

import { useEffect, useState } from "react";
import { vote } from "./vote";
import VotingCard from "./components/VotingCard";
import { AdjustedProposal } from "./utils/types";

const spaceName = import.meta.env.VITE_SNAPSHOT_SPACE_NAME;

export default function Layout() {
  return (
    <SequenceKit config={config}>
      <App />
    </SequenceKit>
  );
}

function App() {
  const { isConnected } = useAccount();

  const [proposals, setProposals] = useState<Array<AdjustedProposal>>([]);

  const [voteCount, setVoteCount] = useState(0);

  useEffect(() => {
    console.log("get votes");
    vote.getProposals(20, 0, "created", "desc").then((r) => {
      setProposals(r.data.proposals);
    });
  }, [voteCount]);

  return (
    <SequenceBoilerplate
      githubUrl="https://github.com/0xsequence-demos/kit-embedded-wallet-snapshot-boilerplate"
      name="Sequence + Snapshot"
      description="Use an Embedded Wallet to vote on proposals on Snapshot."
      wagmi={{ useAccount, useDisconnect, useSwitchChain }}
    >
      {isConnected ? <Connected /> : <NotConnected />}
      <br />
      <Group>
        <h1 className="text-center p-0">
          Proposals for{" "}
          <Button variant="secondary">
            <a
              target="_blank"
              href={`https://snapshot.box/#/s:${spaceName}`}
              rel="noreferrer"
            >
              {spaceName}
            </a>
          </Button>
        </h1>
        {proposals.length > 0
          ? proposals.map((p) => (
              <VotingCard
                proposal={p}
                key={`proposal-${p.id}`}
                voteCount={voteCount}
                setVoteCount={setVoteCount}
              />
            ))
          : "loading..."}
      </Group>
    </SequenceBoilerplate>
  );
}
