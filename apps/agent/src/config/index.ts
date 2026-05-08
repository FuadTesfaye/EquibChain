import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Solana configuration
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    commitment: "confirmed" as const,
    programId: process.env.PROGRAM_ID || "EqubChain11111111111111111111111111111111111111",
    usdcMint: process.env.USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },

  // Agent configuration
  agent: {
    scoringKey: process.env.SCORING_KEYPAIR || "",
    managerKey: process.env.MANAGER_KEYPAIR || "",
    fraudKey: process.env.FRAUD_KEYPAIR || "",
    notificationKey: process.env.NOTIFICATION_KEYPAIR || "",
  },

  // x402 configuration
  x402: {
    endpoint: process.env.X402_ENDPOINT || "http://localhost:3001",
    paymentKey: process.env.X402_PAYMENT_KEY || "",
  },

  // Server configuration
  server: {
    port: parseInt(process.env.AGENT_PORT || "3002"),
    host: process.env.AGENT_HOST || "localhost",
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "logs/agent.log",
  },

  // Monitoring configuration
  monitoring: {
    cycleCheckInterval: process.env.CYCLE_CHECK_INTERVAL || "*/5 * * * *", // Every 5 minutes
    healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL || "0 * * * *", // Every hour
    disbursementInterval: process.env.DISBURSEMENT_INTERVAL || "*/10 * * * *", // Every 10 minutes
    cleanupInterval: process.env.CLEANUP_INTERVAL || "0 0 * * *", // Daily at midnight
  },

  // Fraud detection thresholds
  fraud: {
    lowThreshold: parseFloat(process.env.FRAUD_LOW_THRESHOLD || "0.3"),
    mediumThreshold: parseFloat(process.env.FRAUD_MEDIUM_THRESHOLD || "0.7"),
    highThreshold: parseFloat(process.env.FRAUD_HIGH_THRESHOLD || "0.9"),
  },

  // Scoring weights
  scoring: {
    walletAge: parseFloat(process.env.SCORING_WEIGHT_WALLET_AGE || "0.15"),
    transactionHistory: parseFloat(process.env.SCORING_WEIGHT_TX_HISTORY || "0.20"),
    balanceStability: parseFloat(process.env.SCORING_WEIGHT_BALANCE_STABILITY || "0.15"),
    defiInteractions: parseFloat(process.env.SCORING_WEIGHT_DEFII || "0.15"),
    previousEqubParticipation: parseFloat(process.env.SCORING_WEIGHT_PREVIOUS_EQUB || "0.25"),
    suspiciousActivity: parseFloat(process.env.SCORING_WEIGHT_SUSPICIOUS || "0.10"),
  },
};
