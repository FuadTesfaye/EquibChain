import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { EqubchainSDK } from "@equbchain/sdk";
import { logger } from "./utils/logger";
import { config } from "./config";
import { X402MockServer } from "./x402/mock-server";
import { ScoringAgent } from "./agents/scoring-agent";
import { PoolManagerAgent } from "./agents/pool-manager-agent";
import { FraudDetectionAgent } from "./agents/fraud-detection-agent";

class EqubChainAgent {
  private connection: Connection;
  private sdk: EqubchainSDK;
  private x402Server: X402MockServer;
  private scoringAgent: ScoringAgent;
  private poolManagerAgent: PoolManagerAgent;
  private fraudDetectionAgent: FraudDetectionAgent;
  private isRunning: boolean = false;

  constructor() {
    // Initialize Solana connection
    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: config.solana.commitment,
    });

    // Initialize SDK (mock implementation for now)
    const mockWallet = {
      publicKey: new PublicKey(config.agent.managerKey),
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };

    this.sdk = EqubchainSDK.create(
      this.connection,
      mockWallet as any,
      new PublicKey(config.solana.programId)
    );

    // Initialize x402 mock server
    this.x402Server = new X402MockServer(3001);

    // Initialize agents
    this.scoringAgent = new ScoringAgent(
      this.sdk,
      this.connection,
      config.x402.endpoint,
      config.x402.paymentKey
    );

    this.poolManagerAgent = new PoolManagerAgent(this.sdk, this.connection);
    this.fraudDetectionAgent = new FraudDetectionAgent(
      this.sdk,
      this.connection,
      config.x402.endpoint
    );
  }

  /**
   * Start the EqubChain agent system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("EqubChain agent is already running");
      return;
    }

    try {
      logger.info("Starting EqubChain agent system");

      // Start x402 mock server
      this.x402Server.start();

      // Start all agents
      this.poolManagerAgent.start();

      // Perform initial setup
      await this.performInitialSetup();

      this.isRunning = true;
      logger.info("EqubChain agent system started successfully");

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error("Failed to start EqubChain agent system", { error });
      process.exit(1);
    }
  }

  /**
   * Stop the EqubChain agent system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn("EqubChain agent system is not running");
      return;
    }

    try {
      logger.info("Stopping EqubChain agent system");

      // Stop all agents
      this.poolManagerAgent.stop();

      // Stop x402 server
      this.x402Server.stop();

      this.isRunning = false;
      logger.info("EqubChain agent system stopped");

    } catch (error) {
      logger.error("Error stopping EqubChain agent system", { error });
    }
  }

  /**
   * Perform initial setup
   */
  private async performInitialSetup(): Promise<void> {
    try {
      logger.info("Performing initial setup");

      // Wait for connection to be ready
      await this.connection.getLatestBlockhash();

      // Initialize scoring for existing pools
      await this.scoringAgent.updateAllMemberScores();

      // Perform initial fraud detection
      await this.fraudDetectionAgent.analyzeAllPoolMembers();

      // Force initial pool check
      await this.poolManagerAgent.forceCheckAllPools();

      logger.info("Initial setup completed");

    } catch (error) {
      logger.error("Failed to perform initial setup", { error });
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      await this.stop();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }

  /**
   * Get system status
   */
  async getStatus(): Promise<any> {
    try {
      const connectionStatus = await this.connection.getLatestBlockhash();
      
      return {
        isRunning: this.isRunning,
        connection: {
          rpcUrl: config.solana.rpcUrl,
          connected: !!connectionStatus.lastValidBlockHeight,
          lastBlockHeight: connectionStatus.lastValidBlockHeight,
        },
        agents: {
          poolManager: this.poolManagerAgent.getStatus(),
          scoring: {
            active: true, // Scoring agent doesn't have status method yet
          },
          fraudDetection: {
            statistics: this.fraudDetectionAgent.getStatistics(),
          },
        },
        x402Server: {
          running: true, // Mock server doesn't have status method yet
          endpoint: config.x402.endpoint,
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to get system status", { error });
      return {
        error: "Failed to get status",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Run manual tasks
   */
  async runManualTask(task: string, params: any = {}): Promise<any> {
    try {
      logger.info(`Running manual task: ${task}`, { params });

      switch (task) {
        case "updateScores":
          await this.scoringAgent.updateAllMemberScores();
          return { success: true, message: "Scores updated" };

        case "checkPools":
          await this.poolManagerAgent.forceCheckAllPools();
          return { success: true, message: "Pools checked" };

        case "analyzeFraud":
          await this.fraudDetectionAgent.analyzeAllPoolMembers();
          return { success: true, message: "Fraud analysis completed" };

        case "generateReputation":
          if (!params.walletAddress) {
            throw new Error("walletAddress parameter required");
          }
          const reputation = await this.scoringAgent.generateReputationReport(
            new PublicKey(params.walletAddress)
          );
          return { success: true, reputation };

        case "analyzeWallet":
          if (!params.walletAddress) {
            throw new Error("walletAddress parameter required");
          }
          const fraudAnalysis = await this.fraudDetectionAgent.analyzeWallet(
            new PublicKey(params.walletAddress)
          );
          return { success: true, fraudAnalysis };

        default:
          throw new Error(`Unknown task: ${task}`);
      }
    } catch (error) {
      logger.error(`Failed to run manual task: ${task}`, { error, params });
      return { success: false, error: error.message };
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const agent = new EqubChainAgent();

  switch (command) {
    case "start":
      await agent.start();
      break;

    case "status":
      const status = await agent.getStatus();
      console.log(JSON.stringify(status, null, 2));
      break;

    case "task":
      const task = process.argv[3];
      const params = parseTaskParams(process.argv.slice(4));
      const result = await agent.runManualTask(task, params);
      console.log(JSON.stringify(result, null, 2));
      break;

    default:
      console.log(`
Usage: npm run dev [command]

Commands:
  start              Start the agent system
  status             Get system status
  task <task> [params]  Run manual task

Tasks:
  updateScores        Update all member scores
  checkPools         Check all pools for completed cycles
  analyzeFraud       Analyze all pool members for fraud
  generateReputation --walletAddress=<address>  Generate reputation report for wallet
  analyzeWallet --walletAddress=<address>  Analyze wallet for fraud

Examples:
  npm run dev start
  npm run dev status
  npm run dev task updateScores
  npm run dev task generateReputation --walletAddress=ABC123...
      `);
      process.exit(1);
  }
}

function parseTaskParams(args: string[]): any {
  const params: any = {};
  
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      params[key] = value;
    }
  }
  
  return params;
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection", { reason, promise });
  process.exit(1);
});

// Start the agent
if (require.main === module) {
  main().catch((error) => {
    logger.error("Failed to start agent", { error });
    process.exit(1);
  });
}

export { EqubChainAgent };
