"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolana } from "@/providers/solana-provider";
import { ArrowLeft, Users, Clock, Shield, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

interface Member {
  wallet: string;
  joinedAt: number;
  contributionHistory: number[];
  totalContributed: number;
  payoutReceived: number;
  missedCycles: number;
  aiScore: number;
  activeStatus: boolean;
}

interface PoolDetails {
  id: string;
  name: string;
  creator: string;
  contributionAmount: number;
  cycleDuration: number;
  maxMembers: number;
  currentCycle: number;
  memberCount: number;
  poolState: "forming" | "active" | "completed" | "paused";
  healthScore: number;
  nextPayoutIn: number;
  totalValue: number;
  createdAt: number;
  description: string;
  members: Member[];
}

export default function PoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState("overview");
  const [isJoining, setIsJoining] = useState(false);

  const poolId = params.id as string;

  // Mock pool data - in real app, this would come from SDK
  const { data: pool, isLoading, error } = useQuery({
    queryKey: ["pool", poolId],
    queryFn: async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        id: poolId,
        name: "Global Savings Circle",
        creator: "5Kk...xyz",
        contributionAmount: 100,
        cycleDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxMembers: 10,
        currentCycle: 3,
        memberCount: 8,
        poolState: "active",
        healthScore: 85,
        nextPayoutIn: 2 * 24 * 60 * 60 * 1000, // 2 days
        totalValue: 800,
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        description: "A trusted rotating savings pool for global community members. Join us in building financial freedom through decentralized trust.",
        members: [
          {
            wallet: "5Kk...abc",
            joinedAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
            contributionHistory: [1, 2, 3],
            totalContributed: 300,
            payoutReceived: 1,
            missedCycles: 0,
            aiScore: 85,
            activeStatus: true,
          },
          {
            wallet: "7Lm...def",
            joinedAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
            contributionHistory: [1, 2],
            totalContributed: 200,
            payoutReceived: 0,
            missedCycles: 1,
            aiScore: 72,
            activeStatus: true,
          },
          {
            wallet: "9Gh...ghi",
            joinedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
            contributionHistory: [1, 2, 3],
            totalContributed: 300,
            payoutReceived: 2,
            missedCycles: 0,
            aiScore: 91,
            activeStatus: true,
          },
        ],
      } as PoolDetails;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount / 100); // Convert to USD (assuming 6 decimals)
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleJoinPool = async () => {
    if (!connected || !pool || isJoining) return;
    
    setIsJoining(true);
    try {
      // In real app, this would call SDK.joinPool()
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`Joined pool ${poolId}`);
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to join pool:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "forming": return "bg-yellow-100 text-yellow-800";
      case "active": return "bg-green-100 text-green-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "paused": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Pool not found</h2>
          <p className="text-muted-foreground">The pool you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-skeleton h-96 w-full max-w-4xl rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Pools</span>
            </button>
            <h1 className="text-xl font-bold flex-1 text-center">{pool?.name}</h1>
          </div>
        </div>
      </div>

      {/* Pool Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {pool && (
          <>
            {/* Pool Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-6 rounded-xl mb-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStateColor(pool.poolState)}`}>
                      {pool.poolState.toUpperCase()}
                    </span>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className={getHealthColor(pool.healthScore)}>
                        {pool.healthScore}/100
                      </span>
                    </div>
                    Health Score
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Next Payout</div>
                  <div className="text-2xl font-bold">
                    {pool.nextPayoutIn ? formatTime(pool.nextPayoutIn) : "N/A"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Value</div>
                  <div className="text-2xl font-bold">{formatAmount(pool.totalValue)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Contribution</div>
                  <div className="text-lg font-semibold">{formatAmount(pool.contributionAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Cycle</div>
                  <div className="text-lg font-semibold">{formatTime(pool.cycleDuration)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Members</div>
                  <div className="text-lg font-semibold">{pool.memberCount}/{pool.maxMembers}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Current Cycle</div>
                  <div className="text-lg font-semibold">{pool.currentCycle}</div>
                </div>
              </div>

              <p className="text-muted-foreground mb-6">{pool.description}</p>

              {/* Join Button */}
              {pool.poolState === "forming" && !pool.members.some(m => m.wallet === publicKey?.toBase58()) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleJoinPool}
                  disabled={!connected || isJoining}
                  className="w-full btn-primary"
                >
                  {isJoining ? "Joining..." : "Join Pool"}
                </motion.button>
              )}

              {pool.poolState === "active" && pool.members.some(m => m.wallet === publicKey?.toBase58()) && (
                <div className="w-full btn-secondary">
                  You are already a member
                </div>
              )}
            </motion.div>

            {/* Tabs */}
            <div className="border-b border-border mb-8">
              <div className="flex space-x-8">
                {["overview", "members", "activity"].map((tab) => (
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
                  className="space-y-6"
                >
                  <div className="glass p-6 rounded-xl">
                    <h3 className="text-lg font-semibold mb-4">Pool Statistics</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Created</div>
                        <div className="text-lg font-semibold">
                          {Math.floor((Date.now() - pool.createdAt) / (24 * 60 * 60 * 1000))} days ago
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Creator</div>
                        <div className="text-lg font-semibold">{formatAddress(pool.creator)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Avg. AI Score</div>
                        <div className="text-lg font-semibold">
                          {Math.round(pool.members.reduce((sum, m) => sum + m.aiScore, 0) / pool.members.length)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                        <div className="text-lg font-semibold">92.5%</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "members" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {pool.members.map((member, index) => (
                    <motion.div
                      key={member.wallet}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass p-4 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                            {member.wallet.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold">{formatAddress(member.wallet)}</div>
                            <div className="text-sm text-muted-foreground">
                              AI Score: {member.aiScore}/100
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Contributed</div>
                          <div className="text-lg font-semibold">{formatAmount(member.totalContributed)}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            {member.payoutReceived > 0 && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {member.missedCycles > 0 && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {member.payoutReceived}/{pool.currentCycle - 1} payouts
                            </span>
                          </div>
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
                  className="glass p-6 rounded-xl"
                >
                  <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {[
                      { type: "contribution", user: "5Kk...abc", amount: 100, time: "2 hours ago" },
                      { type: "payout", user: "9Gh...def", amount: 800, time: "1 day ago" },
                      { type: "join", user: "3Lm...ghi", amount: 0, time: "3 days ago" },
                      { type: "contribution", user: "7Lm...ghi", amount: 100, time: "3 days ago" },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.type === "contribution" ? "bg-green-500" :
                            activity.type === "payout" ? "bg-blue-500" :
                            activity.type === "join" ? "bg-yellow-500" : "bg-gray-500"
                          }`} />
                          <div>
                            <div className="font-medium">{formatAddress(activity.user)}</div>
                            <div className="text-sm text-muted-foreground">{activity.time}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{activity.type}</div>
                          {activity.amount > 0 && (
                            <div className="text-lg font-semibold">{formatAmount(activity.amount)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
