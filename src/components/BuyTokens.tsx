import { Card, Spinner } from "@0xsequence/design-system";
import { SequenceIndexer, TokenBalance } from "@0xsequence/indexer";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { getMessageFromUnknownError } from "../utils/getMessageFromUnknownError";
import ErrorToast from "./ErrorToast";
import { Button } from "boilerplate-design-system";

function formatTime(s: number) {
  if (isNaN(s)) {
    console.warn(`formatTime recieved NaN`);
    return "";
  }
  const date = new Date(0);
  date.setSeconds(s); // specify value for SECONDS here
  const timeString = date.toISOString().substring(11, 19);
  return timeString;
}

const indexerClient = new SequenceIndexer(
  `https://${import.meta.env.VITE_CHAIN_HANDLE}-indexer.sequence.app`,
  import.meta.env.VITE_SEQUENCE_PROJECT_ACCESS_KEY,
);

const BuyTokens = () => {
  const { address } = useAccount();
  const {
    isPending: isEncoding,
    data: signedMessage,
    signMessage,
  } = useSignMessage();

  useEffect(() => {
    if (address && !signedMessage && !isEncoding) {
      signMessage({ message: "let me in" });
    }
  }, [address, isEncoding, signMessage, signedMessage]);

  const [isRedeeming, setIsRedeeming] = useState(false);

  const [confirmedCoinCount, setConfirmedCoinCount] = useState(0n);

  const [minterErrorMessage, setMinterErrorMessage] = useState<string>("");
  const [indexerErrorMessage, setIndexerErrorMessage] = useState<string>("");
  const [authErrorMessage, setAuthErrorMessage] = useState<string>("");

  const [inventoryStatus, setInventoryStatus] = useState<
    "unknown" | "empty" | "populated"
  >("unknown");

  useEffect(() => {
    if (!signedMessage || !address) {
      return;
    }
    fetch("api/redeem", {
      method: "GET",
      headers: {
        authorization: `${address}:${signedMessage}`,
      },
    })
      .then((response) => {
        response.json().then((d) => {
          if (d.timeRemaining) {
            setTimeRemaining(d.timeRemaining);
            setTimerOffset(Math.round(performance.now() * 0.001));
          } else {
            setAuthErrorMessage("Connect To Redeem");
          }
        });
      })
      .catch((e) => {
        console.log(e);
      });
  }, [signedMessage, address]);

  //start polling indexer
  useQuery({
    queryKey: ["tokens", address],
    queryFn: async () => {
      if (!address) {
        return [];
      }
      try {
        const r = await indexerClient.getTokenBalances({
          accountAddress: address,
          contractAddress: import.meta.env.VITE_COIN_CONTRACT_ADDRESS,
          includeMetadata: false,
        });
        const balances: TokenBalance[] = r.balances || [];
        setInventoryStatus(balances.length === 0 ? "empty" : "populated");
        const coinCount = BigInt(
          balances.find((token: TokenBalance) => token.tokenID === "0")
            ?.balance || "0",
        );
        if (coinCount !== confirmedCoinCount) {
          setConfirmedCoinCount(coinCount);
        }
        return balances;
      } catch (e) {
        setIndexerErrorMessage(getMessageFromUnknownError(e));
        setTimeout(() => setIndexerErrorMessage(""), 5000);
        return [];
      }
    },
    refetchInterval: 5000,
    initialData: [],
    enabled: !!address,
  });

  const [timerOffset, setTimerOffset] = useState(0);
  const [timer, setTimer] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    setInterval(() => {
      setTimer(Math.round(performance.now() * 0.001));
    }, 100);
  }, []);

  const remainingSeconds = Math.max(0, timeRemaining - (timer - timerOffset));

  return (
    <>
      <Card
        display="flex"
        flexDirection="row"
        gap="8"
        marginBottom="8"
        justifyContent="center"
      >
        <div>Sequence Demo Coins:</div>
        <div>
          {inventoryStatus === "unknown"
            ? "..."
            : (
                parseInt((confirmedCoinCount / 1000000000000000n).toString()) /
                1000
              ).toFixed(3)}
        </div>
        {minterErrorMessage && (
          <ErrorToast
            description={minterErrorMessage}
            onClose={() => {
              setMinterErrorMessage("");
            }}
          />
        )}
        {indexerErrorMessage && (
          <ErrorToast
            description={indexerErrorMessage}
            onClose={() => {
              setIndexerErrorMessage("");
            }}
          />
        )}
        <Button
          variant="primary"
          className="purchase"
          onClick={() => {
            if (isRedeeming) {
              return;
            }
            setIsRedeeming(true);
            fetch("api/redeem", {
              method: "POST",
              headers: {
                authorization: `${address}:${signedMessage}`,
              },
              body: JSON.stringify({
                action: "redeemDaily",
              }),
            })
              .then((response) => {
                response.json().then((d) => {
                  console.log(d);
                  setTimeRemaining(d.timeRemaining);
                  setTimerOffset(Math.round(performance.now() * 0.001));
                  setIsRedeeming(false);
                });
              })
              .catch((e) => {
                console.log(e);
                setTimeout(() => {
                  setIsRedeeming(false);
                }, 5000);
              });
          }}
          type="button"
          disabled={isEncoding || isRedeeming}
        >
          {isEncoding || isRedeeming ? (
            <>
              ONE MOMENT PLEASE <Spinner />
            </>
          ) : authErrorMessage ? (
            authErrorMessage
          ) : (
            `REDEEM DAILY ${remainingSeconds === 0 ? "NOW" : `IN ${formatTime(remainingSeconds)}`}`
          )}
        </Button>
      </Card>
    </>
  );
};

export default BuyTokens;
