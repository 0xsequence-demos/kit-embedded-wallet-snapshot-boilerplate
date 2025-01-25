import { walletClientToSigner } from "@0xsequence/kit";
import { Card, Button } from "boilerplate-design-system";
import { Dispatch, SetStateAction, useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { vote } from "../vote";
import { AdjustedProposal } from "../utils/types";

function VotingCard(props: {
  proposal: AdjustedProposal;
  voteCount: number;
  setVoteCount: Dispatch<SetStateAction<number>>;
}) {
  const { proposal, voteCount, setVoteCount } = props;
  const chainId = useChainId();

  const publicClient = usePublicClient({ chainId });

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
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
  const total = proposal.scores.reduce((pv, cv) => pv + cv);
  const percents = proposal.scores.map((s) =>
    total > 0 ? (s / total) * 100 : 0,
  );
  const winnerIndex =
    total > 0
      ? percents.indexOf(percents.reduce((pv, cv) => Math.max(pv, cv)))
      : -1;

  return (
    <Card
      collapsable
      title={proposal.title}
      data-id={proposal.id}
      className="flex flex-col gap-5 bg-white/10 border border-white/10 backdrop-blur-sm text-center p-0"
    >
      <div className="p-4">
        <div className="flex gap-4 w-full sm:flex-row flex-col text-left">
          <div className="flex flex-col items-start w-full">
            <p className="text-14">{proposal.body}</p>
            <div className="flex flex-1 gap-2">
              <br />
              {proposal.choices.map((c, i: number) => {
                const disabled = !address || isVoting;
                const percent = percents[i].toFixed(1).replace(".0", "");
                return (
                  <Button
                    variant="primary"
                    className="rounded-[0.5rem] w-full font-bold text-14"
                    style={{
                      opacity: disabled ? "30%" : "100%",
                      border:
                        winnerIndex === i
                          ? "solid rgb(255, 207, 3) 2px"
                          : "none",
                    }}
                    disabled={disabled}
                    key={`proposal-${proposal.id} choice${i}`}
                    onClick={() => onClickVote(proposal.id, i + 1)}
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
  );
}

export default VotingCard;
