"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolana } from "@/providers/solana-provider";
import { ArrowRight, TrendingUp, Users, Clock, DollarSign, Shield, AlertCircle, CheckCircle, Activity } from "lucide-react";

interface DashboardStats {
  totalValue: number;
  activePools: number;
  completedPools: number;
  totalContributions: number;
  totalPayouts: number;
  averageAiScore: number;
  successRate: number;
}

interface UserPool {
  id: string;
  name: string;
  contributionAmount: number;
  currentCycle: number;
  nextPayoutIn: number;
  poolState: string;
  totalValue: number;
  userContribution: number;
  userPayouts: number;
}

interface RecentActivity {
  id: string;
  type: "contribution" | "payout" | "join" | "create";
  description: string;
  amount: number;
  timestamp: number;
  status: "success" | "pending" | "failed";
}

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState("overview");

  // Mock dashboard data - in real app, this would come from SDK
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        totalValue: 12500,
        activePools: 3,
        completedPools: 2,
        totalContributions: 45,
        totalPayouts: 38,
        averageAiScore: 82,
        successRate: 97.5,
      } as DashboardStats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: userPools = [] } = useQuery({
    queryKey: ["user-pools", publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return [];
      await new Promise(resolve => setTimeout(resolve, 800));
      return [
        {
          id: "1",
          name: "Global Savings Circle",
          contributionAmount: 100,
          currentCycle: 3,
          nextPayoutIn: 2 * 24 * 60 * 60 * 1000,
          poolState: "active",
          totalValue: 800,
          userContribution: 300,
          userPayouts: 1,
        },
        {
          id: "2",
          name: "Tech Community Fund",
          contributionAmount: 500,
          currentCycle: 1,
          nextPayoutIn: 5 * 24 * 60 * 60 * 1000,
          poolState: "active",
          totalValue: 7500,
          userContribution: 500,
          userPayouts: 0,
        },
      ] as UserPool[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["recent-activity", publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return [];
      await new Promise(resolve => setTimeout(resolve, 800));
      return [
        {
          id: "1",
          type: "contribution",
          description: "Contributed to Global Savings Circle",
          amount: 100,
          timestamp: Date.now() - 2 * 60 * 60 * 1000,
          status: "success",
        },
        {
          id: "2",
          type: "payout",
          description: "Received payout from Tech Community Fund",
          amount: 800,
          timestamp: Date.now() - 24 * 60 * 60 * 1000,
          status: "success",
        },
        {
          id: "3",
          type: "contribution",
          description: "Contributed to Global Savings Circle",
          amount: 100,
          timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
          status: "pending",
        },
      ] as RecentActivity[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount / 100); // Convert to USD (assuming 6 decimals)
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-skeleton h-96 w-full max-w-4xl rounded-xl" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass p-8 rounded-xl max-w-md">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to view your dashboard and manage your rotating savings pools.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your rotating savings and track your financial progress
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="glass p-6 rounded-xl">
            <div className="flex items-center space-x-3 mb-2">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{formatAmount(stats.totalValue)}</div>
                <div className="text-sm text-muted-foreground">Total Value</div>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-xl">
            <div className="flex items-center space-x-3 mb-2">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.activePools}</div>
                <div className="text-sm text-muted-foreground">Active Pools</div>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-xl">
            <div className="flex items-center space-x-3 mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.completedPools}</div>
                <div className="text-sm text-muted-foreground">Completed Pools</div>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-xl">
            <div className="flex items-center space-x-3 mb-2">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.successRate}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-xl">
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="w-8 h-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{stats.averageAiScore}/100</div>
                <div className="text-sm text-muted-foreground">Avg. AI Score</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="border-b border-border mb-8">
          <div className="flex space-x-8">
            {["overview", "pools", "activity"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Your Pools */}
              <div className="glass p-6 rounded-xl">
                <h3 className="text-xl font-semibold mb-6">Your Pools</h3>
                <div className="space-y-4">
                  {userPools.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground">You haven't joined any pools yet.</div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-primary mt-4"
                      >
                        Discover Pools
                      </motion.button>
                    </div>
                  ) : (
                    userPools.map((pool, index) => (
                      <motion.div
                        key={pool.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 border border-border rounded-lg card-hover cursor-pointer"
                        onClick={() => {
                          // Navigate to pool details
                          console.log(`Navigate to pool ${pool.id}`);
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{pool.name}</h4>
                            <div className="text-sm text-muted-foreground">
                              {pool.poolState.toUpperCase()} • Cycle {pool.currentCycle}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Next payout</div>
                            <div className="font-semibold">
                              {pool.nextPayoutIn ? getTimeAgo(pool.nextPayoutIn) : "N/A"}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Contribution</div>
                            <div className="font-semibold">{formatAmount(pool.contributionAmount)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Contributed</div>
                            <div className="font-semibold">{formatAmount(pool.userContribution)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Payouts</div>
                            <div className="font-semibold">{pool.userPayouts}</div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass p-6 rounded-xl">
                <h3 className="text-xl font-semibold mb-6">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-primary p-4"
                  >
                    <Activity className="w-5 h-5 mr-2" />
                    Create New Pool
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-secondary p-4"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Discover Pools
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "pools" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {userPools.map((pool, index) => (
                <motion.div
                  key={pool.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass p-6 rounded-xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{pool.name}</h3>
                      <div className="text-sm text-muted-foreground mb-4">
                        {pool.poolState.toUpperCase()} • {formatAmount(pool.totalValue)} total value
                      </div>
                    </div>
                    <ArrowRight className="text-muted-foreground" />
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Your Contribution</div>
                      <div className="text-2xl font-bold">{formatAmount(pool.userContribution)}</div>
                      <div className="text-sm text-muted-foreground">
                        of {formatAmount(pool.contributionAmount * (pool.currentCycle - 1))} total
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Your Payouts</div>
                      <div className="text-2xl font-bold">{formatAmount(pool.userPayouts * pool.contributionAmount)}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Progress: Cycle {pool.currentCycle} of {pool.maxMembers}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Next payout: {pool.nextPayoutIn ? getTimeAgo(pool.nextPayoutIn) : "N/A"}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass p-4 rounded-xl"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${
                      activity.status === "success" ? "bg-green-500" :
                      activity.status === "pending" ? "bg-yellow-500" :
                      "bg-red-500"
                    }`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{activity.description}</h4>
                          <div className="text-sm text-muted-foreground">
                            {formatTime(activity.timestamp)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground capitalize">{activity.type}</div>
                          {activity.amount > 0 && (
                            <div className="text-lg font-semibold">{formatAmount(activity.amount)}</div>
                          )}
                        </div>
                      </div>
                      {activity.status === "pending" && (
                        <div className="flex items-center space-x-2 text-yellow-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Processing...</span>
                        </div>
                      )}
                      {activity.status === "failed" && (
                        <div className="flex items-center space-x-2 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">Failed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
