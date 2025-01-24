import { useAccount } from "wagmi";

import { Group, Card } from "boilerplate-design-system";
import BuyTokens from "../components/BuyTokens";

export function Connected() {
  const { address, chain, chainId } = useAccount();

  if (!address || !chain || !chainId) {
    return (
      <div className="flex flex-col gap-8">
        <Group title="User info">
          <Card
            style={{ gap: "1rem", display: "flex", flexDirection: "column" }}
          >
            Missing information (
            {[
              !address ? "address" : null,
              !chain ? "chain" : null,
              !chainId ? "chainId" : null,
            ]
              .filter((n) => !!n)
              .join(", ")}
            ) required to display user info
          </Card>
        </Group>
      </div>
    );
  }

  return (
    <>
      <p>
        Voting power is proportional to your Sequence Demo Coins (SDC) balance
        on Arbitrum One.
      </p>
      <p>You can redeem free SDC once a day!</p>
      <br />
      <div className="flex flex-col gap-8">
        <Group>
          <Card
            collapsable
            title="Get Voting Power"
            data-id="get-voting-power"
            className="bg-white/10 border border-white/10 backdrop-blur-sm"
          >
            <BuyTokens />
          </Card>
        </Group>
      </div>
      <br />
      <div className="flex flex-col gap-4">
        <p>
          Voting power is calculated at the time of creation of a proposal.
          According to Snapshot Labs, this is by design, to prevent governance
          abuse.
        </p>
        <p>
          As a result, these proposals are recreated daily, so come back and
          vote tomorrow!
        </p>
      </div>
    </>
  );
}
