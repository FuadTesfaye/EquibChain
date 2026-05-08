"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolana } from "@/providers/solana-provider";
import { WalletAdapterProvider } from "@/providers/wallet-adapter-provider";
import { QueryProvider } from "@/providers/query-provider";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Users, TrendingUp, Sparkles } from "lucide-react";
import { HeroScene } from "@/components/hero-scene";
import { NetworkGlobe } from "@/components/network-globe";
import { PoolFlowVisualization } from "@/components/pool-flow-visualization";

export default function HomePage() {
  const { connected, publicKey } = useSolana();
  const { connecting } = useWallet();

  return (
    <WalletAdapterProvider>
      <QueryProvider>
        <div className="min-h-screen bg-background text-foreground">
          {/* Hero Section */}
          <section className="relative min-h-screen flex items-center justify-center overflow-hidden cinematic-border">
            <HeroScene />
            
            {/* Content Overlay */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <motion.h1
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gradient mb-6"
                >
                  The world's oldest savings system.
                  <br />
                  <span className="text-3xl sm:text-4xl lg:text-5xl">
                    Rebuilt for the internet.
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8"
                >
                  Trustless rotating savings powered by Solana, AI reputation, and programmable finance.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
                >
                  <WalletMultiButton>
                    <WalletMultiButton className="btn-primary">
                      {connecting ? "Connecting..." : connected ? "Launch App" : "Connect Wallet"}
                    </WalletMultiButton>
                  </WalletMultiButton>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-secondary"
                    onClick={() => {
                      // Navigate to demo
                      console.log("View Demo clicked");
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    View Demo
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-ghost"
                    onClick={() => {
                      // Navigate to architecture docs
                      console.log("Read Architecture clicked");
                    }}
                  >
                    Read Architecture
                  </motion.button>
                </motion.div>

                {/* Feature Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, type: "spring" }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
                >
                  {[
                    {
                      icon: Shield,
                      title: "Trustless & Secure",
                      description: "On-chain escrow ensures your funds are always safe. No more disappearing members or fraud.",
                    },
                    {
                      icon: Users,
                      title: "AI-Powered Reputation",
                      description: "Advanced scoring algorithms analyze wallet history to build trust scores and prevent abuse.",
                    },
                    {
                      icon: TrendingUp,
                      title: "Global & Accessible",
                      description: "Borderless Solana technology enables instant contributions from anywhere in the world.",
                    },
                  ].map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.0 + index * 0.1 }}
                      className="glass p-6 rounded-xl card-hover text-center"
                    >
                      <feature.icon className="w-8 h-8 mx-auto mb-4 text-primary" />
                      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* 3D Visualizations Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Experience the Future of Community Finance
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Interactive visualizations powered by Solana and AI
                </p>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass p-6 rounded-xl"
                >
                  <h3 className="text-xl font-semibold mb-4 text-center">Global Network Activity</h3>
                  <div className="h-64 lg:h-96">
                    <NetworkGlobe />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass p-6 rounded-xl"
                >
                  <h3 className="text-xl font-semibold mb-4 text-center">Pool Flow Visualization</h3>
                  <div className="h-64 lg:h-96">
                    <PoolFlowVisualization />
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  How EqubChain Works
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Experience the future of community finance
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  {
                    step: "1",
                    title: "Create Pool",
                    description: "Set contribution amount, cycle duration, and invite members to join your rotating savings group.",
                  },
                  {
                    step: "2",
                    title: "Contribute",
                    description: "Each member contributes the fixed amount to the on-chain escrow every cycle.",
                  },
                  {
                    step: "3",
                    title: "Disburse",
                    description: "One member receives the full pooled amount each cycle. Fair and transparent distribution.",
                  },
                  {
                    step: "4",
                    title: "Repeat",
                    description: "Continue until every member has received their payout. Complete trust and financial coordination.",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold">
                        {item.step}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                        <p className="text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    {index < 3 && (
                      <ArrowRight className="absolute top-6 -right-4 w-6 h-6 text-muted-foreground/30" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Trusted by Communities Worldwide
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                {[
                  { value: "$2.5M+", label: "Total Value Secured", icon: Shield },
                  { value: "10K+", label: "Active Members", icon: Users },
                  { value: "99.9%", label: "Success Rate", icon: TrendingUp },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass p-6 rounded-xl"
                  >
                    <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                      {stat.value}
                    </div>
                    <div className="text-muted-foreground">{stat.label}</div>
                    <stat.icon className="w-6 h-6 mx-auto text-primary" />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Ready to Transform Community Finance?
                </h2>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of users already building trust and financial freedom with EqubChain.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <WalletMultiButton>
                    <WalletMultiButton className="btn-primary text-lg px-8 py-4">
                      {connecting ? "Connecting..." : connected ? "Get Started Now" : "Connect Wallet"}
                    </WalletMultiButton>
                  </WalletMultiButton>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-ghost text-lg px-8 py-4"
                    onClick={() => {
                      // Navigate to documentation
                      console.log("Learn More clicked");
                    }}
                  >
                    Learn More
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </section>
        </div>
      </QueryProvider>
    </WalletAdapterProvider>
  );
}
