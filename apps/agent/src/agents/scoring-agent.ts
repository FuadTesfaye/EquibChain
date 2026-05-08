import { Connection, PublicKey } from "@solana/web3.js";
import { EqubchainSDK } from "@equbchain/sdk";
import { logger } from "../utils/logger";
import axios from "axios";

interface WalletAnalytics {
  walletAddress: string;
  score: number;
  factors: {
    walletAge: number;
    transactionHistory: number;
    balanceStability: number;
    defiInteractions: number;
    previousEqubParticipation: number;
    suspiciousActivity: number;
  };
  recommendations: string[];
  lastUpdated: string;
}

export class ScoringAgent {
  private sdk: EqubchainSDK;
  private connection: Connection;
  private x402Endpoint: string;
  private paymentKey: string;

  constructor(
    sdk: EqubchainSDK,
    connection: Connection,
    x402Endpoint: string,
    paymentKey: string
  ) {
    this.sdk = sdk;
    this.connection = connection;
    this.x402Endpoint = x402Endpoint;
    this.paymentKey = paymentKey;
  }

  /**
   * Calculate AI score for a wallet
   */
  async calculateWalletScore(walletAddress: PublicKey): Promise<number> {
    try {
      const address = walletAddress.toBase58();
      
      // Get wallet analytics from x402 endpoint
      const analytics = await this.getWalletAnalytics(address);
      
      // Calculate weighted score
      const score = this.calculateWeightedScore(analytics);
      
      logger.info("Calculated wallet score", {
        wallet: address,
        score,
        factors: analytics.factors,
      });
      
      return score;
      
    } catch (error) {
      logger.error("Failed to calculate wallet score", { error, wallet: walletAddress.toBase58() });
      return 50; // Default neutral score
    }
  }

  /**
   * Update member scores for all pools
   */
  async updateAllMemberScores(): Promise<void> {
    try {
      const pools = await this.sdk.getAllPools();
      
      for (const pool of pools) {
        await this.updatePoolMemberScores(pool);
      }
      
    } catch (error) {
      logger.error("Failed to update all member scores", { error });
    }
  }

  /**
   * Update scores for members of a specific pool
   */
  async updatePoolMemberScores(pool: any): Promise<void> {
    try {
      const members = await this.sdk.getPoolMembers(pool.poolId);
      
      for (const member of members) {
        if (member.activeStatus) {
          const newScore = await this.calculateWalletScore(member.wallet);
          
          // Only update if score changed significantly
          if (Math.abs(newScore - member.aiScore) > 5) {
            await this.sdk.updateMemberScore({
              poolId: pool.poolId,
              member: member.wallet,
              newScore,
            });
            
            logger.info("Updated member score", {
              poolId: pool.poolId,
              member: member.wallet.toBase58(),
              oldScore: member.aiScore,
              newScore,
            });
          }
        }
      }
      
    } catch (error) {
      logger.error("Failed to update pool member scores", { error, poolId: pool.poolId });
    }
  }

  /**
   * Get wallet analytics from x402 endpoint
   */
  private async getWalletAnalytics(address: string): Promise<WalletAnalytics> {
    try {
      // First, make payment request
      const paymentResponse = await axios.get(`${this.x402Endpoint}/api/wallet/${address}/analytics`);
      
      if (paymentResponse.status === 402) {
        // Payment required, make payment
        const paymentReceipt = await this.makePayment(paymentResponse.data.paymentRequest);
        
        // Retry with payment receipt
        const response = await axios.get(`${this.x402Endpoint}/api/wallet/${address}/analytics`, {
          headers: {
            "X-Payment-Info": JSON.stringify(paymentReceipt),
          },
        });
        
        return response.data;
      }
      
      return paymentResponse.data;
      
    } catch (error) {
      logger.error("Failed to get wallet analytics", { error, address });
      throw error;
    }
  }

  /**
   * Make payment for analytics
   */
  private async makePayment(paymentRequest: any): Promise<any> {
    // In a real implementation, this would create and send a Solana transaction
    // For mock, we'll simulate the payment
    
    logger.info("Making payment for analytics", { paymentRequest });
    
    const mockReceipt = {
      transactionHash: `mock_tx_${Date.now()}`,
      from: this.paymentKey,
      to: paymentRequest.address,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      timestamp: new Date().toISOString(),
      signature: "mock_signature",
    };
    
    // Verify payment with mock server
    await axios.post(`${this.x402Endpoint}/api/payments/verify`, mockReceipt);
    
    return mockReceipt;
  }

  /**
   * Calculate weighted score from analytics
   */
  private calculateWeightedScore(analytics: WalletAnalytics): number {
    const weights = {
      walletAge: 0.15,
      transactionHistory: 0.20,
      balanceStability: 0.15,
      defiInteractions: 0.15,
      previousEqubParticipation: 0.25,
      suspiciousActivity: 0.10,
    };
    
    let score = 0;
    
    // Normalize factors to 0-100 scale
    const normalizedFactors = {
      walletAge: Math.min(analytics.factors.walletAge / 365 * 100, 100),
      transactionHistory: Math.min(analytics.factors.transactionHistory / 1000 * 100, 100),
      balanceStability: analytics.factors.balanceStability * 100,
      defiInteractions: Math.min(analytics.factors.defiInteractions / 50 * 100, 100),
      previousEqubParticipation: Math.min(analytics.factors.previousEqubParticipation / 5 * 100, 100),
      suspiciousActivity: Math.max(0, 100 - analytics.factors.suspiciousActivity * 1000),
    };
    
    score += normalizedFactors.walletAge * weights.walletAge;
    score += normalizedFactors.transactionHistory * weights.transactionHistory;
    score += normalizedFactors.balanceStability * weights.balanceStability;
    score += normalizedFactors.defiInteractions * weights.defiInteractions;
    score += normalizedFactors.previousEqubParticipation * weights.previousEqubParticipation;
    score += normalizedFactors.suspiciousActivity * weights.suspiciousActivity;
    
    return Math.round(Math.min(score, 100));
  }

  /**
   * Monitor contribution patterns and adjust scores
   */
  async monitorContributionPatterns(): Promise<void> {
    try {
      const pools = await this.sdk.getAllPools();
      
      for (const pool of pools) {
        const members = await this.sdk.getPoolMembers(pool.poolId);
        
        for (const member of members) {
          const contributionRate = this.calculateContributionRate(member, pool);
          const adjustment = this.calculateScoreAdjustment(contributionRate);
          
          if (Math.abs(adjustment) > 2) {
            const newScore = Math.max(0, Math.min(100, member.aiScore + adjustment));
            
            await this.sdk.updateMemberScore({
              poolId: pool.poolId,
              member: member.wallet,
              newScore,
            });
            
            logger.info("Adjusted score based on contribution pattern", {
              poolId: pool.poolId,
              member: member.wallet.toBase58(),
              contributionRate,
              adjustment,
              oldScore: member.aiScore,
              newScore,
            });
          }
        }
      }
      
    } catch (error) {
      logger.error("Failed to monitor contribution patterns", { error });
    }
  }

  /**
   * Calculate contribution rate for a member
   */
  private calculateContributionRate(member: any, pool: any): number {
    if (pool.currentCycle === 0) return 1.0;
    
    const expectedContributions = Math.min(pool.currentCycle, member.contributionHistory.length);
    const actualContributions = member.contributionHistory.filter((cycle: number) => 
      cycle <= pool.currentCycle
    ).length;
    
    return expectedContributions > 0 ? actualContributions / expectedContributions : 0;
  }

  /**
   * Calculate score adjustment based on contribution rate
   */
  private calculateScoreAdjustment(contributionRate: number): number {
    if (contributionRate >= 0.95) return 5;  // Excellent
    if (contributionRate >= 0.85) return 2;  // Good
    if (contributionRate >= 0.75) return 0;  // Neutral
    if (contributionRate >= 0.50) return -3; // Poor
    return -5; // Very Poor
  }

  /**
   * Generate reputation report for a wallet
   */
  async generateReputationReport(walletAddress: PublicKey): Promise<any> {
    try {
      const address = walletAddress.toBase58();
      const analytics = await this.getWalletAnalytics(address);
      const score = this.calculateWeightedScore(analytics);
      
      // Get member's pool participation
      const pools = await this.sdk.getAllPools();
      const memberPools = [];
      
      for (const pool of pools) {
        const member = await this.sdk.getMember(pool.poolId, walletAddress);
        if (member) {
          memberPools.push({
            poolId: pool.poolId,
            contributionAmount: pool.contributionAmount,
            totalContributed: member.totalContributed,
            payoutReceived: member.payoutReceived,
            activeStatus: member.activeStatus,
          });
        }
      }
      
      return {
        walletAddress: address,
        overallScore: score,
        analytics,
        poolParticipation: memberPools,
        riskLevel: this.getRiskLevel(score),
        recommendations: analytics.recommendations,
        generatedAt: new Date().toISOString(),
      };
      
    } catch (error) {
      logger.error("Failed to generate reputation report", { error, wallet: walletAddress.toBase58() });
      throw error;
    }
  }

  /**
   * Get risk level based on score
   */
  private getRiskLevel(score: number): string {
    if (score >= 80) return "low";
    if (score >= 60) return "medium";
    return "high";
  }
}
