import { getDefaultWaasConnectors } from "@0xsequence/connect";
import { mainnet } from "viem/chains";
import { createConfig, http } from "wagmi";

// Get your own keys on sequence.build
const projectAccessKey = import.meta.env.VITE_PROJECT_ACCESS_KEY;
const waasConfigKey = import.meta.env.VITE_WAAS_CONFIG_KEY;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;
const appleRedirectURI = window.location.origin + window.location.pathname;
const walletConnectId = import.meta.env.VITE_WALLET_CONNECT_ID;

const connectors = getDefaultWaasConnectors({
  walletConnectProjectId: walletConnectId,
  waasConfigKey,
  googleClientId,
  // Notice: Apple Login only works if deployed on https (to support Apple redirects)
  appleClientId,
  appleRedirectURI,
  /* Arbitrum sepolia chainId */
  defaultChainId: 1,
  appName: "Kit Starter",
  projectAccessKey,
});

const transports = {
  1: http(),
};

export const config = createConfig({
  transports,
  connectors,
  chains: [mainnet],
});

export const kitConfig = {
  projectAccessKey,
};
