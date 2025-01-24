import { SequenceKit, walletClientToSigner } from "@0xsequence/kit";
import { config } from "./config";
import "@0xsequence/design-system/styles.css";

import {
  useAccount,
  useDisconnect,
  useSwitchChain,
  useWalletClient,
  usePublicClient,
  useChainId,
} from "wagmi";
import { NotConnected } from "./views/NotConnected";
import { Connected } from "./views/Connected";
import {
  Button,
  Card,
  Group,
  SequenceBoilerplate,
} from "boilerplate-design-system";

import { Proposal } from "@snapshot-labs/snapshot.js/dist/src/sign/types";
import { useEffect, useState } from "react";
import { vote } from "./vote";

const spaceName = import.meta.env.VITE_SNAPSHOT_SPACE_NAME;

export default function Layout() {
  return (
    <SequenceKit config={config}>
      <App />
    </SequenceKit>
  );
}

function App() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [proposals, setProposals] = useState<
    Array<Proposal & { id: string; scores: number[] }>
  >([]);

  const [voteCount, setVoteCount] = useState(0);

  useEffect(() => {
    console.log("get votes");
    vote.getProposals(20, 0, "created", "desc").then((r) => {
      setProposals(r.data.proposals);
    });
  }, [voteCount]);

  const chainId = useChainId();

  const publicClient = usePublicClient({ chainId });

  const [isVoting, setIsVoting] = useState(false);

  const onClickVote = (proposalId: string, choice: number) => {
    if (walletClient && publicClient) {
      setIsVoting(true);
      walletClientToSigner(walletClient).then((provider) => {
        vote
          .castVote(
            {
              _signTypedData: provider.signTypedData.bind(provider),
            },
            address!,
            proposalId,
            choice,
          )
          .then(() => {
            setVoteCount(voteCount + 1);
            setIsVoting(false);
          });
      });
    }
  };
  const totals = proposals.map((p) => p.scores.reduce((pv, cv) => pv + cv));
  const percents = proposals.map((p, i) =>
    p.scores.map((s) => (totals[i] > 0 ? (s / totals[i]) * 100 : 0)),
  );
  const winnerIndex = percents.map((p, i) =>
    totals[i] > 0 ? p.indexOf(p.reduce((pv, cv) => Math.max(pv, cv))) : -1,
  );

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
          ? proposals.map((p, i) => (
              <Card
                collapsable
                title={p.title}
                data-id={p.id}
                className="flex flex-col gap-5 bg-white/10 border border-white/10 backdrop-blur-sm text-center p-0"
                key={`proposal${i}`}
              >
                <div className="p-4">
                  <div className="flex gap-4 w-full sm:flex-row flex-col text-left">
                    <div className="flex flex-col items-start w-full">
                      <p className="text-14">{p.body}</p>
                      <div className="flex flex-1 gap-2">
                        <br />
                        {p.choices.map((c, j: number) => {
                          const disabled = !address || isVoting;
                          const percent = percents[i][j]
                            .toFixed(1)
                            .replace(".0", "");
                          return (
                            <Button
                              variant="primary"
                              className="rounded-[0.5rem] w-full font-bold text-14"
                              style={{
                                opacity: disabled ? "30%" : "100%",
                                border:
                                  winnerIndex[i] === j
                                    ? "solid rgb(255, 207, 3) 2px"
                                    : "none",
                              }}
                              disabled={disabled}
                              key={`proposal${i} choice${j}`}
                              onClick={() => onClickVote(p.id, j + 1)}
                            >
                              {`${c} (${percent}%)`}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          : "loading..."}
      </Group>
    </SequenceBoilerplate>
  );
}
