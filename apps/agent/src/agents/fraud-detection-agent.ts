import { Connection, PublicKey } from "@solana/web3.js";
import { EqubchainSDK } from "@equbchain/sdk";
import { logger } from "../utils/logger";
import axios from "axios";

interface FraudDetectionRequest {
  walletAddress: string;
  behavior: {
    rapidTransactions: boolean;
    suspiciousPatterns: boolean;
    highFrequencySmallAmounts: boolean;
    multipleWallets: boolean;
    unusualTiming: boolean;
    circularTransactions: boolean;
  };
}

interface FraudDetectionResult {
  walletAddress: string;
  fraudScore: number;
  riskLevel: "low" | "medium" | "high";
  detectedPatterns: string[];
  recommendations: string[];
  detectedAt: string;
}

export class FraudDetectionAgent {
  private sdk: EqubchainSDK;
  private connection: Connection;
  private x402Endpoint: string;
  private suspiciousWallets: Map<string, any> = new Map();
  private fraudThresholds = {
    low: 0.3,
    medium: 0.7,
    high: 0.9,
  };

  constructor(
    sdk: EqubchainSDK,
    connection: Connection,
    x402Endpoint: string
  ) {
    this.sdk = sdk;
    this.connection = connection;
    this.x402Endpoint = x402Endpoint;
  }

  /**
   * Analyze wallet for fraud patterns
   */
  async analyzeWallet(walletAddress: PublicKey): Promise<FraudDetectionResult> {
    try {
      const address = walletAddress.toBase58();
      
      // Get wallet behavior patterns
      const behavior = await this.analyzeWalletBehavior(address);
      
      // Create fraud detection request
      const request: FraudDetectionRequest = {
        walletAddress: address,
        behavior,
      };
      
      // Get fraud score from x402 endpoint
      const fraudResult = await this.getFraudScore(request);
      
      // Enhance with on-chain analysis
      const enhancedResult = await this.enhanceWithOnChainAnalysis(address, fraudResult);
      
      // Store in suspicious wallets if high risk
      if (enhancedResult.riskLevel === "high") {
        this.suspiciousWallets.set(address, {
          ...enhancedResult,
          firstDetected: new Date().toISOString(),
        });
        
        logger.warn("High fraud risk detected", {
          wallet: address,
          fraudScore: enhancedResult.fraudScore,
          patterns: enhancedResult.detectedPatterns,
        });
      }
      
      return enhancedResult;
      
    } catch (error) {
      logger.error("Failed to analyze wallet for fraud", { error, wallet: walletAddress.toBase58() });
      return this.getDefaultResult(walletAddress.toBase58());
    }
  }

  /**
   * Analyze all active pool members for fraud
   */
  async analyzeAllPoolMembers(): Promise<void> {
    try {
      const pools = await this.sdk.getAllPools();
      
      for (const pool of pools) {
        await this.analyzePoolMembers(pool);
      }
      
    } catch (error) {
      logger.error("Failed to analyze all pool members", { error });
    }
  }

  /**
   * Analyze members of a specific pool
   */
  async analyzePoolMembers(pool: any): Promise<void> {
    try {
      const members = await this.sdk.getPoolMembers(pool.poolId);
      
      for (const member of members) {
        if (member.activeStatus) {
          const fraudResult = await this.analyzeWallet(member.wallet);
          
          // Take action based on fraud score
          if (fraudResult.fraudScore > this.fraudThresholds.high) {
            await this.handleHighRiskMember(pool, member, fraudResult);
          }
        }
      }
      
    } catch (error) {
      logger.error("Failed to analyze pool members", { error, poolId: pool.poolId });
    }
  }

  /**
   * Analyze wallet behavior patterns
   */
  private async analyzeWalletBehavior(address: string): Promise<FraudDetectionRequest["behavior"]> {
    // In a real implementation, this would analyze transaction history
    // For now, we'll use mock behavior analysis
    
    return {
      rapidTransactions: await this.checkRapidTransactions(address),
      suspiciousPatterns: await this.checkSuspiciousPatterns(address),
      highFrequencySmallAmounts: await this.checkHighFrequencySmallAmounts(address),
      multipleWallets: await this.checkMultipleWallets(address),
      unusualTiming: await this.checkUnusualTiming(address),
      circularTransactions: await this.checkCircularTransactions(address),
    };
  }

  /**
   * Get fraud score from x402 endpoint
   */
  private async getFraudScore(request: FraudDetectionRequest): Promise<any> {
    try {
      const response = await axios.post(`${this.x402Endpoint}/api/fraud/detect`, request);
      return response.data;
      
    } catch (error) {
      logger.error("Failed to get fraud score from x402 endpoint", { error });
      return {
        walletAddress: request.walletAddress,
        fraudScore: 0.1, // Default low risk
        riskLevel: "low",
      };
    }
  }

  /**
   * Enhance fraud result with on-chain analysis
   */
  private async enhanceWithOnChainAnalysis(
    address: string,
    baseResult: any
  ): Promise<FraudDetectionResult> {
    const onChainPatterns = await this.analyzeOnChainPatterns(address);
    const detectedPatterns = [...(baseResult.detectedPatterns || []), ...onChainPatterns];
    
    // Calculate enhanced fraud score
    let enhancedScore = baseResult.fraudScore || 0;
    
    // Add weight for on-chain patterns
    if (onChainPatterns.includes("pool_hopping")) enhancedScore += 0.2;
    if (onChainPatterns.includes("contribution_timing_manipulation")) enhancedScore += 0.3;
    if (onChainPatterns.includes("multiple_simultaneous_pools")) enhancedScore += 0.15;
    
    enhancedScore = Math.min(enhancedScore, 1.0);
    
    return {
      walletAddress: address,
      fraudScore: enhancedScore,
      riskLevel: this.getRiskLevel(enhancedScore),
      detectedPatterns,
      recommendations: this.generateRecommendations(enhancedScore, detectedPatterns),
      detectedAt: new Date().toISOString(),
    };
  }

  /**
   * Analyze on-chain patterns
   */
  private async analyzeOnChainPatterns(address: string): Promise<string[]> {
    const patterns = [];
    
    try {
      // Get all pools where this wallet is a member
      const pools = await this.sdk.getAllPools();
      const memberPools = [];
      
      for (const pool of pools) {
        const member = await this.sdk.getMember(pool.poolId, new PublicKey(address));
        if (member) {
          memberPools.push({
            poolId: pool.poolId,
            joinedAt: member.joinedAt,
            totalContributed: member.totalContributed,
            missedCycles: member.missedCycles,
          });
        }
      }
      
      // Check for pool hopping (joining and leaving many pools quickly)
      if (this.isPoolHopping(memberPools)) {
        patterns.push("pool_hopping");
      }
      
      // Check for contribution timing manipulation
      if (this.hasContributionTimingManipulation(memberPools)) {
        patterns.push("contribution_timing_manipulation");
      }
      
      // Check for multiple simultaneous pools with similar patterns
      if (this.hasMultipleSimultaneousPools(memberPools)) {
        patterns.push("multiple_simultaneous_pools");
      }
      
    } catch (error) {
      logger.error("Failed to analyze on-chain patterns", { error, address });
    }
    
    return patterns;
  }

  /**
   * Check if wallet is pool hopping
   */
  private isPoolHopping(memberPools: any[]): boolean {
    if (memberPools.length < 5) return false;
    
    const sortedPools = memberPools.sort((a, b) => a.joinedAt - b.joinedAt);
    let quickJoins = 0;
    
    for (let i = 1; i < sortedPools.length; i++) {
      const timeDiff = sortedPools[i].joinedAt - sortedPools[i - 1].joinedAt;
      if (timeDiff < 7 * 24 * 60 * 60) { // Less than 7 days apart
        quickJoins++;
      }
    }
    
    return quickJoins > memberPools.length * 0.6;
  }

  /**
   * Check for contribution timing manipulation
   */
  private hasContributionTimingManipulation(memberPools: any[]): boolean {
    for (const pool of memberPools) {
      if (pool.missedCycles === 0 && pool.totalContributed > 0) {
        // Always contributes exactly on time - could be automated
        // In a real implementation, this would check exact timing patterns
        return Math.random() < 0.3; // Mock 30% chance
      }
    }
    return false;
  }

  /**
   * Check for multiple simultaneous pools with similar patterns
   */
  private hasMultipleSimultaneousPools(memberPools: any[]): boolean {
    const activePools = memberPools.filter(pool => pool.totalContributed > 0);
    return activePools.length > 10;
  }

  /**
   * Handle high risk member
   */
  private async handleHighRiskMember(pool: any, member: any, fraudResult: FraudDetectionResult): Promise<void> {
    try {
      logger.warn("Handling high risk member", {
        poolId: pool.poolId,
        member: member.wallet.toBase58(),
        fraudScore: fraudResult.fraudScore,
        patterns: fraudResult.detectedPatterns,
      });

      // In a real implementation, this might:
      // 1. Flag the member for manual review
      // 2. Suspend the member from pools
      // 3. Report to authorities
      // 4. Notify other pool creators
      
      // For now, we'll just log and potentially slash
      if (fraudResult.fraudScore > 0.8) {
        logger.error("Critical fraud risk detected - recommend suspension", {
          poolId: pool.poolId,
          member: member.wallet.toBase58(),
        });
        
        // In a real implementation:
        // await this.sdk.slashDefaulter({
        //   poolId: pool.poolId,
        //   member: member.wallet,
        // }, usdcMint, pool.creator);
      }
      
    } catch (error) {
      logger.error("Failed to handle high risk member", { error });
    }
  }

  /**
   * Get risk level based on score
   */
  private getRiskLevel(score: number): "low" | "medium" | "high" {
    if (score < this.fraudThresholds.low) return "low";
    if (score < this.fraudThresholds.medium) return "medium";
    return "high";
  }

  /**
   * Generate recommendations based on fraud score and patterns
   */
  private generateRecommendations(score: number, patterns: string[]): string[] {
    const recommendations = [];
    
    if (score > 0.7) {
      recommendations.push("Immediate manual review required");
      recommendations.push("Consider temporary suspension");
    } else if (score > 0.4) {
      recommendations.push("Increase monitoring frequency");
      recommendations.push("Require additional verification");
    } else {
      recommendations.push("Continue normal monitoring");
    }
    
    if (patterns.includes("pool_hopping")) {
      recommendations.push("Limit pool participation rate");
    }
    
    if (patterns.includes("contribution_timing_manipulation")) {
      recommendations.push("Implement contribution time randomization");
    }
    
    if (patterns.includes("multiple_simultaneous_pools")) {
      recommendations.push("Set maximum concurrent pool limit");
    }
    
    return recommendations;
  }

  /**
   * Get default fraud detection result
   */
  private getDefaultResult(address: string): FraudDetectionResult {
    return {
      walletAddress: address,
      fraudScore: 0.1,
      riskLevel: "low",
      detectedPatterns: [],
      recommendations: ["Continue normal monitoring"],
      detectedAt: new Date().toISOString(),
    };
  }

  // Mock behavior analysis methods
  private async checkRapidTransactions(address: string): Promise<boolean> {
    return Math.random() < 0.1; // 10% chance
  }

  private async checkSuspiciousPatterns(address: string): Promise<boolean> {
    return Math.random() < 0.05; // 5% chance
  }

  private async checkHighFrequencySmallAmounts(address: string): Promise<boolean> {
    return Math.random() < 0.15; // 15% chance
  }

  private async checkMultipleWallets(address: string): Promise<boolean> {
    return Math.random() < 0.08; // 8% chance
  }

  private async checkUnusualTiming(address: string): Promise<boolean> {
    return Math.random() < 0.12; // 12% chance
  }

  private async checkCircularTransactions(address: string): Promise<boolean> {
    return Math.random() < 0.03; // 3% chance
  }

  /**
   * Get fraud detection statistics
   */
  getStatistics(): any {
    const totalWallets = this.suspiciousWallets.size;
    const highRiskCount = Array.from(this.suspiciousWallets.values()).filter(
      (w: any) => w.riskLevel === "high"
    ).length;
    
    return {
      totalSuspiciousWallets: totalWallets,
      highRiskWallets: highRiskCount,
      mediumRiskWallets: totalWallets - highRiskCount,
      lastAnalysis: new Date().toISOString(),
    };
  }

  /**
   * Clear old suspicious wallet records
   */
  clearOldRecords(daysOld: number = 30): void {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let cleared = 0;
    
    for (const [address, record] of this.suspiciousWallets.entries()) {
      if (record.firstDetected < cutoffTime) {
        this.suspiciousWallets.delete(address);
        cleared++;
      }
    }
    
    logger.info(`Cleared ${cleared} old suspicious wallet records`);
  }
}
