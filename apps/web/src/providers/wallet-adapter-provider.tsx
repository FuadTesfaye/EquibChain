"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import { SolanaProvider } from "./solana-provider";

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new BackpackWalletAdapter(),
];

export function WalletAdapterProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetwork] = useState<WalletAdapterNetwork>("devnet");
  const [autoConnect, setAutoConnect] = useState(true);

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const handleNetworkChange = useCallback((newNetwork: WalletAdapterNetwork) => {
    setNetwork(newNetwork);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={autoConnect}
        onError={(error) => {
          console.error("Wallet error:", error);
          // Show toast notification here
        }}
        onSuccess={() => {
          console.log("Wallet connected successfully");
        }}
      >
        <SolanaProvider>{children}</SolanaProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
