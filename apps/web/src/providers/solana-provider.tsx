"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { EqubchainSDK } from "@equbchain/sdk";
import { Cluster, clusterApiUrl } from "@solana/web3.js";

interface SolanaContextType {
  sdk: EqubchainSDK | null;
  connection: Connection;
  connected: boolean;
  publicKey: PublicKey | null;
  cluster: Cluster;
  setCluster: (cluster: Cluster) => void;
}

const SolanaContext = createContext<SolanaContextType | undefined>(undefined);

export function useSolana() {
  const context = useContext(SolanaContext);
  if (!context) {
    throw new Error("useSolana must be used within SolanaProvider");
  }
  return context;
}

interface SolanaProviderProps {
  children: React.ReactNode;
  defaultCluster?: Cluster;
}

export function SolanaProvider({ children, defaultCluster = "devnet" }: SolanaProviderProps) {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [cluster, setCluster] = useState<Cluster>(defaultCluster);
  const [sdk, setSdk] = useState<EqubchainSDK | null>(null);

  // Update connection when cluster changes
  const updateConnection = useCallback((newCluster: Cluster) => {
    const newConnection = new Connection(clusterApiUrl(newCluster), {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000,
    });
    setCluster(newCluster);
    return newConnection;
  }, []);

  // Initialize SDK when wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      // Mock wallet implementation for SDK
      const wallet = {
        publicKey,
        signTransaction: async (tx: any) => {
          // This would be handled by the wallet adapter
          return tx;
        },
        signAllTransactions: async (txs: any[]) => {
          return txs;
        },
      };

      try {
        const programId = new PublicKey("EqubChain11111111111111111111111111111111111111");
        const equbchainSDK = EqubchainSDK.create(connection, wallet as any, programId);
        setSdk(equbchainSDK);
      } catch (error) {
        console.error("Failed to initialize SDK:", error);
        setSdk(null);
      }
    } else {
      setSdk(null);
    }
  }, [connected, publicKey, connection]);

  const contextValue: SolanaContextType = {
    sdk,
    connection,
    connected,
    publicKey,
    cluster,
    setCluster: updateConnection,
  };

  return (
    <SolanaContext.Provider value={contextValue}>
      {children}
    </SolanaContext.Provider>
  );
}
