import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import axios from "axios";
import { logger } from "../utils/logger";

// x402 Payment Request Schema
const PaymentRequestSchema = z.object({
  address: z.string(),
  amount: z.string(),
  currency: z.string().default("USDC"),
  network: z.string().default("solana"),
  memo: z.string().optional(),
  expiresAt: z.string().optional(),
});

// Payment Receipt Schema
const PaymentReceiptSchema = z.object({
  transactionHash: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  currency: z.string(),
  timestamp: z.string(),
  signature: z.string(),
});

// Wallet Analytics Response Schema
const WalletAnalyticsSchema = z.object({
  walletAddress: z.string(),
  score: z.number().min(0).max(100),
  factors: z.object({
    walletAge: z.number(),
    transactionHistory: z.number(),
    balanceStability: z.number(),
    defiInteractions: z.number(),
    previousEqubParticipation: z.number(),
    suspiciousActivity: z.number(),
  }),
  recommendations: z.array(z.string()),
  lastUpdated: z.string(),
});

export class X402MockServer {
  private app: express.Application;
  private port: number;
  private payments: Map<string, any> = new Map();

  constructor(port: number = 3001) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        headers: req.headers,
        body: req.body,
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Wallet analytics endpoint (requires x402 payment)
    this.app.get("/api/wallet/:address/analytics", (req, res) => {
      const address = req.params.address;
      const paymentHeader = req.headers["x-payment-info"];
      
      if (!paymentHeader) {
        // Return 402 with payment request
        const paymentRequest = {
          address: "EqubChainPayment111111111111111111111111111111",
          amount: "0.1", // 0.1 USDC
          currency: "USDC",
          network: "solana",
          memo: `Analytics for ${address}`,
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        };

        res.set({
          "Content-Type": "application/json",
          "X-Payment-Required": "true",
          "X-Payment-Request": JSON.stringify(paymentRequest),
        });
        
        return res.status(402).json({
          error: "Payment required",
          paymentRequest,
        });
      }

      // Verify payment receipt
      try {
        const receipt = JSON.parse(paymentHeader as string);
        const validatedReceipt = PaymentReceiptSchema.parse(receipt);
        
        // Check if payment was processed
        const paymentKey = `${validatedReceipt.transactionHash}`;
        if (!this.payments.has(paymentKey)) {
          return res.status(402).json({
            error: "Payment not verified",
          });
        }

        // Return analytics
        const analytics = this.generateWalletAnalytics(address);
        res.json(analytics);
        
      } catch (error) {
        logger.error("Invalid payment receipt", { error, paymentHeader });
        res.status(400).json({
          error: "Invalid payment receipt",
        });
      }
    });

    // Payment verification endpoint
    this.app.post("/api/payments/verify", (req, res) => {
      try {
        const receipt = PaymentReceiptSchema.parse(req.body);
        
        // In a real implementation, this would verify the transaction on-chain
        // For mock, we'll just store it
        const paymentKey = `${receipt.transactionHash}`;
        this.payments.set(paymentKey, {
          ...receipt,
          verifiedAt: new Date().toISOString(),
        });

        logger.info("Payment verified", { transactionHash: receipt.transactionHash });
        
        res.json({
          status: "verified",
          transactionHash: receipt.transactionHash,
        });
        
      } catch (error) {
        logger.error("Payment verification failed", { error });
        res.status(400).json({
          error: "Invalid payment receipt",
        });
      }
    });

    // Pool scoring endpoint
    this.app.get("/api/pool/:poolId/score", (req, res) => {
      const poolId = req.params.poolId;
      const paymentHeader = req.headers["x-payment-info"];
      
      if (!paymentHeader) {
        const paymentRequest = {
          address: "EqubChainPayment111111111111111111111111111111",
          amount: "0.05", // 0.05 USDC
          currency: "USDC",
          network: "solana",
          memo: `Pool scoring for ${poolId}`,
          expiresAt: new Date(Date.now() + 1800000).toISOString(), // 30 minutes
        };

        res.set({
          "Content-Type": "application/json",
          "X-Payment-Required": "true",
          "X-Payment-Request": JSON.stringify(paymentRequest),
        });
        
        return res.status(402).json({
          error: "Payment required",
          paymentRequest,
        });
      }

      try {
        const receipt = JSON.parse(paymentHeader as string);
        const validatedReceipt = PaymentReceiptSchema.parse(receipt);
        
        const paymentKey = `${validatedReceipt.transactionHash}`;
        if (!this.payments.has(paymentKey)) {
          return res.status(402).json({
            error: "Payment not verified",
          });
        }

        const poolScore = this.generatePoolScore(poolId);
        res.json(poolScore);
        
      } catch (error) {
        res.status(400).json({
          error: "Invalid payment receipt",
        });
      }
    });

    // Fraud detection endpoint
    this.app.post("/api/fraud/detect", (req, res) => {
      try {
        const { walletAddress, behavior } = req.body;
        
        const fraudScore = this.detectFraud(walletAddress, behavior);
        res.json({
          walletAddress,
          fraudScore,
          riskLevel: this.getRiskLevel(fraudScore),
          detectedAt: new Date().toISOString(),
        });
        
      } catch (error) {
        res.status(400).json({
          error: "Invalid request",
        });
      }
    });

    // Error handling middleware
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error("Unhandled error", { error: err, path: req.path });
      res.status(500).json({
        error: "Internal server error",
      });
    });
  }

  private generateWalletAnalytics(address: string): z.infer<typeof WalletAnalyticsSchema> {
    // Mock analytics generation
    const score = Math.floor(Math.random() * 40) + 60; // 60-100 range
    
    return {
      walletAddress: address,
      score,
      factors: {
        walletAge: Math.floor(Math.random() * 365) + 30, // 30-395 days
        transactionHistory: Math.floor(Math.random() * 1000) + 100, // 100-1100 transactions
        balanceStability: Math.random() * 0.5 + 0.5, // 0.5-1.0
        defiInteractions: Math.floor(Math.random() * 50), // 0-50 interactions
        previousEqubParticipation: Math.floor(Math.random() * 5), // 0-5 pools
        suspiciousActivity: Math.random() * 0.1, // 0-0.1 (low)
      },
      recommendations: this.generateRecommendations(score),
      lastUpdated: new Date().toISOString(),
    };
  }

  private generatePoolScore(poolId: string): any {
    return {
      poolId,
      healthScore: Math.floor(Math.random() * 30) + 70, // 70-100
      riskFactors: [
        {
          factor: "member_concentration",
          score: Math.random() * 0.3 + 0.7,
          description: "Distribution of contributions across members",
        },
        {
          factor: "contribution_consistency",
          score: Math.random() * 0.2 + 0.8,
          description: "Regularity of member contributions",
        },
        {
          factor: "pool_duration",
          score: Math.random() * 0.4 + 0.6,
          description: "Time since pool creation",
        },
      ],
      recommendations: [
        "Monitor contribution patterns",
        "Maintain diverse member base",
        "Regular pool health checks",
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  private detectFraud(address: string, behavior: any): number {
    // Mock fraud detection
    let fraudScore = 0;
    
    if (behavior.rapidTransactions) fraudScore += 0.3;
    if (behavior.suspiciousPatterns) fraudScore += 0.4;
    if (behavior.highFrequencySmallAmounts) fraudScore += 0.2;
    if (behavior.multipleWallets) fraudScore += 0.1;
    
    return Math.min(fraudScore, 1.0);
  }

  private getRiskLevel(score: number): string {
    if (score < 0.3) return "low";
    if (score < 0.7) return "medium";
    return "high";
  }

  private generateRecommendations(score: number): string[] {
    const recommendations = [];
    
    if (score < 70) {
      recommendations.push("Increase on-chain activity");
      recommendations.push("Maintain stable wallet balance");
    }
    
    if (score < 85) {
      recommendations.push("Participate in more DeFi protocols");
    }
    
    recommendations.push("Maintain good contribution history");
    recommendations.push("Avoid suspicious transaction patterns");
    
    return recommendations;
  }

  public start(): void {
    this.app.listen(this.port, () => {
      logger.info(`x402 Mock Server started on port ${this.port}`);
    });
  }

  public stop(): void {
    // Implementation for graceful shutdown
    logger.info("x402 Mock Server stopping");
  }
}
