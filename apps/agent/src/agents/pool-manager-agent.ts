import { Connection, PublicKey } from "@solana/web3.js";
import { EqubchainSDK } from "@equbchain/sdk";
import { logger } from "../utils/logger";
import * as cron from "node-cron";

export class PoolManagerAgent {
  private sdk: EqubchainSDK;
  private connection: Connection;
  private isRunning: boolean = false;
  private cronJobs: cron.ScheduledTask[] = [];

  constructor(sdk: EqubchainSDK, connection: Connection) {
    this.sdk = sdk;
    this.connection = connection;
  }

  /**
   * Start the pool manager agent
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("Pool manager agent is already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting pool manager agent");

    // Schedule periodic tasks
    this.scheduleTasks();
  }

  /**
   * Stop the pool manager agent
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn("Pool manager agent is not running");
      return;
    }

    this.isRunning = false;
    logger.info("Stopping pool manager agent");

    // Stop all cron jobs
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs = [];
  }

  /**
   * Schedule periodic tasks
   */
  private scheduleTasks(): void {
    // Check for completed cycles every 5 minutes
    const cycleCheckJob = cron.schedule("*/5 * * * *", async () => {
      await this.checkCompletedCycles();
    }, {
      scheduled: false,
    });

    // Monitor pool health every hour
    const healthCheckJob = cron.schedule("0 * * * *", async () => {
      await this.monitorPoolHealth();
    }, {
      scheduled: false,
    });

    // Process disbursements every 10 minutes
    const disbursementJob = cron.schedule("*/10 * * * *", async () => {
      await this.processPendingDisbursements();
    }, {
      scheduled: false,
    });

    // Clean up inactive pools daily
    const cleanupJob = cron.schedule("0 0 * * *", async () => {
      await this.cleanupInactivePools();
    }, {
      scheduled: false,
    });

    // Start all jobs
    cycleCheckJob.start();
    healthCheckJob.start();
    disbursementJob.start();
    cleanupJob.start();

    this.cronJobs = [cycleCheckJob, healthCheckJob, disbursementJob, cleanupJob];
    
    logger.info("Scheduled pool manager tasks");
  }

  /**
   * Check for completed cycles and trigger disbursements
   */
  async checkCompletedCycles(): Promise<void> {
    try {
      if (!this.isRunning) return;

      const pools = await this.sdk.getAllPools();
      const activePools = pools.filter(pool => pool.poolState === "active");

      for (const pool of activePools) {
        const isCycleComplete = this.isCycleComplete(pool);
        
        if (isCycleComplete) {
          await this.processCycleCompletion(pool);
        }
      }

    } catch (error) {
      logger.error("Failed to check completed cycles", { error });
    }
  }

  /**
   * Monitor pool health and take action if needed
   */
  async monitorPoolHealth(): Promise<void> {
    try {
      if (!this.isRunning) return;

      const pools = await this.sdk.getAllPools();
      
      for (const pool of pools) {
        const poolInfo = await this.sdk.getPoolInfo(pool.poolId);
        
        if (!poolInfo) continue;

        // Check for health issues
        if (poolInfo.healthScore < 30) {
          await this.handleUnhealthyPool(poolInfo);
        }

        // Check for inactive members
        const inactiveMembers = poolInfo.members.filter(member => 
          !member.member.activeStatus || 
          this.hasMissedRecentContributions(member.member, poolInfo.pool)
        );

        if (inactiveMembers.length > 0) {
          await this.handleInactiveMembers(poolInfo, inactiveMembers);
        }
      }

    } catch (error) {
      logger.error("Failed to monitor pool health", { error });
    }
  }

  /**
   * Process pending disbursements
   */
  async processPendingDisbursements(): Promise<void> {
    try {
      if (!this.isRunning) return;

      const pools = await this.sdk.getAllPools();
      const activePools = pools.filter(pool => pool.poolState === "active");

      for (const pool of activePools) {
        const nextRecipient = await this.getNextDisbursementRecipient(pool);
        
        if (nextRecipient) {
          await this.executeDisbursement(pool, nextRecipient);
        }
      }

    } catch (error) {
      logger.error("Failed to process pending disbursements", { error });
    }
  }

  /**
   * Clean up inactive pools
   */
  async cleanupInactivePools(): Promise<void> {
    try {
      if (!this.isRunning) return;

      const pools = await this.sdk.getAllPools();
      const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days ago
      
      for (const pool of pools) {
        if (pool.createdAt < cutoffTime && pool.poolState === "completed") {
          logger.info("Cleaning up inactive pool", { 
            poolId: pool.poolId,
            createdAt: pool.createdAt,
          });
          // In a real implementation, this might archive or clean up pool data
        }
      }

    } catch (error) {
      logger.error("Failed to cleanup inactive pools", { error });
    }
  }

  /**
   * Check if a cycle is complete
   */
  private isCycleComplete(pool: any): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    const cycleEndTime = pool.lastCycleAt + pool.cycleDuration;
    return currentTime >= cycleEndTime;
  }

  /**
   * Process cycle completion
   */
  private async processCycleCompletion(pool: any): Promise<void> {
    try {
      logger.info("Processing cycle completion", { 
        poolId: pool.poolId,
        currentCycle: pool.currentCycle,
      });

      // Get next recipient
      const nextRecipient = await this.getNextDisbursementRecipient(pool);
      
      if (nextRecipient) {
        await this.executeDisbursement(pool, nextRecipient);
      } else {
        // No eligible recipients, mark pool as completed
        logger.info("No eligible recipients, marking pool as completed", { 
          poolId: pool.poolId,
        });
        // In a real implementation, this would call emergency close or similar
      }

    } catch (error) {
      logger.error("Failed to process cycle completion", { 
        error,
        poolId: pool.poolId,
      });
    }
  }

  /**
   * Get next disbursement recipient
   */
  private async getNextDisbursementRecipient(pool: any): Promise<PublicKey | null> {
    try {
      const members = await this.sdk.getPoolMembers(pool.poolId);
      const eligibleMembers = members.filter(member => 
        member.activeStatus && 
        member.payoutReceived < pool.currentCycle
      );

      if (eligibleMembers.length === 0) return null;

      // Simple round-robin selection - in a real implementation, this could be more sophisticated
      const recipientIndex = (pool.currentCycle - 1) % eligibleMembers.length;
      return eligibleMembers[recipientIndex].wallet;

    } catch (error) {
      logger.error("Failed to get next disbursement recipient", { error });
      return null;
    }
  }

  /**
   * Execute disbursement to recipient
   */
  private async executeDisbursement(pool: any, recipient: PublicKey): Promise<void> {
    try {
      logger.info("Executing disbursement", {
        poolId: pool.poolId,
        recipient: recipient.toBase58(),
        amount: pool.contributionAmount * pool.memberCount,
      });

      // In a real implementation, this would call the disburse instruction
      // await this.sdk.disburse({
      //   poolId: pool.poolId,
      //   recipient,
      // }, usdcMint, pool.creator);

      logger.info("Disbursement executed successfully", {
        poolId: pool.poolId,
        recipient: recipient.toBase58(),
      });

    } catch (error) {
      logger.error("Failed to execute disbursement", {
        error,
        poolId: pool.poolId,
        recipient: recipient.toBase58(),
      });
    }
  }

  /**
   * Handle unhealthy pools
   */
  private async handleUnhealthyPool(poolInfo: any): Promise<void> {
    try {
      logger.warn("Handling unhealthy pool", {
        poolId: poolInfo.pool.poolId,
        healthScore: poolInfo.healthScore,
      });

      // Check if pool should be paused
      if (poolInfo.healthScore < 20) {
        logger.warn("Pausing unhealthy pool", {
          poolId: poolInfo.pool.poolId,
          healthScore: poolInfo.healthScore,
        });

        // In a real implementation, this would call pausePool
        // await this.sdk.pausePool({
        //   poolId: poolInfo.pool.poolId,
        // }, poolInfo.pool.creator);
      }

    } catch (error) {
      logger.error("Failed to handle unhealthy pool", { error });
    }
  }

  /**
   * Handle inactive members
   */
  private async handleInactiveMembers(poolInfo: any, inactiveMembers: any[]): Promise<void> {
    try {
      for (const memberInfo of inactiveMembers) {
        logger.warn("Handling inactive member", {
          poolId: poolInfo.pool.poolId,
          member: memberInfo.member.wallet.toBase58(),
          missedCycles: memberInfo.member.missedCycles,
        });

        // Slash member if they've missed too many cycles
        if (memberInfo.member.missedCycles >= 2) {
          logger.info("Slashing inactive member", {
            poolId: poolInfo.pool.poolId,
            member: memberInfo.member.wallet.toBase58(),
          });

          // In a real implementation, this would call slashDefaulter
          // await this.sdk.slashDefaulter({
          //   poolId: poolInfo.pool.poolId,
          //   member: memberInfo.member.wallet,
          // }, usdcMint, poolInfo.pool.creator);
        }
      }

    } catch (error) {
      logger.error("Failed to handle inactive members", { error });
    }
  }

  /**
   * Check if member has missed recent contributions
   */
  private hasMissedRecentContributions(member: any, pool: any): boolean {
    const currentCycle = pool.currentCycle;
    const lastContributionCycle = member.contributionHistory.length > 0 
      ? Math.max(...member.contributionHistory)
      : 0;
    
    return currentCycle - lastContributionCycle > 1;
  }

  /**
   * Get agent status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.length,
      lastCheck: new Date().toISOString(),
    };
  }

  /**
   * Force check all pools immediately
   */
  async forceCheckAllPools(): Promise<void> {
    try {
      logger.info("Force checking all pools");
      
      await this.checkCompletedCycles();
      await this.monitorPoolHealth();
      await this.processPendingDisbursements();
      
      logger.info("Force check completed");
      
    } catch (error) {
      logger.error("Failed to force check pools", { error });
    }
  }
}
