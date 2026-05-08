import {
  AnchorProvider,
  Program,
  Wallet,
  setProvider,
} from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  Signer,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

import { PDAHelpers } from "./pda";
import * as types from "./types";

// This would be generated from the Anchor program
export interface EqubchainProgram {
  programId: PublicKey;
  methods: {
    initializePool: (
      poolId: number,
      contributionAmount: number,
      cycleDuration: number,
      maxMembers: number
    ) => any;
    joinPool: (poolId: number) => any;
    contribute: (poolId: number) => any;
    disburse: (poolId: number, recipient: PublicKey) => any;
    updateMemberScore: (
      poolId: number,
      member: PublicKey,
      newScore: number
    ) => any;
    setScoringAuthority: (poolId: number, newAuthority: PublicKey) => any;
    slashDefaulter: (poolId: number, member: PublicKey) => any;
    pausePool: (poolId: number) => any;
    resumePool: (poolId: number) => any;
    emergencyClose: (poolId: number) => any;
  };
  account: {
    pool: any;
    member: any;
  };
}

export class EqubchainSDK {
  private program: EqubchainProgram;
  private provider: AnchorProvider;
  private connection: Connection;

  constructor(
    program: EqubchainProgram,
    provider: AnchorProvider,
    connection: Connection
  ) {
    this.program = program;
    this.provider = provider;
    this.connection = connection;
    PDAHelpers.programId = program.programId;
  }

  /**
   * Create new SDK instance
   */
  static create(
    connection: Connection,
    wallet: Wallet,
    programId: PublicKey
  ): EqubchainSDK {
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    setProvider(provider);

    // Note: In real implementation, this would be the actual Anchor program
    const program = {
      programId,
      methods: {
        initializePool: () => ({}),
        joinPool: () => ({}),
        contribute: () => ({}),
        disburse: () => ({}),
        updateMemberScore: () => ({}),
        setScoringAuthority: () => ({}),
        slashDefaulter: () => ({}),
        pausePool: () => ({}),
        resumePool: () => ({}),
        emergencyClose: () => ({}),
      },
      account: {
        pool: null,
        member: null,
      },
    } as EqubchainProgram;

    return new EqubchainSDK(program, provider, connection);
  }

  /**
   * Initialize a new pool
   */
  async initializePool(
    params: types.CreatePoolParams,
    usdcMint: PublicKey,
    creator?: Signer
  ): Promise<string> {
    const signer = creator || this.provider.wallet;
    const { pool, escrow } = PDAHelpers.getPoolPDAs(params.poolId);

    const memberTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      signer.publicKey
    );

    const transaction = new Transaction();

    // Create member token account if it doesn't exist
    const accountInfo = await this.connection.getAccountInfo(memberTokenAccount);
    if (!accountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          signer.publicKey,
          memberTokenAccount,
          signer.publicKey,
          usdcMint
        )
      );
    }

    // Add initialize pool instruction
    const instruction = this.program.methods
      .initializePool(
        params.poolId,
        params.contributionAmount,
        params.cycleDuration,
        params.maxMembers
      )
      .accounts({
        creator: signer.publicKey,
        pool: pool.pubkey,
        escrowVault: escrow.pubkey,
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    transaction.add(instruction);

    return await this.provider.sendAndConfirm(transaction, [signer]);
  }

  /**
   * Join an existing pool
   */
  async joinPool(
    params: types.JoinPoolParams,
    creator: PublicKey,
    member?: Signer
  ): Promise<string> {
    const signer = member || this.provider.wallet;
    const { pool } = PDAHelpers.getPoolPDAs(params.poolId);
    const { member: memberPda } = PDAHelpers.getMemberPDAs(
      params.poolId,
      signer.publicKey
    );

    const instruction = this.program.methods
      .joinPool(params.poolId)
      .accounts({
        member: signer.publicKey,
        pool: pool.pubkey,
        creator,
        memberAccount: memberPda.pubkey,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);

    return await this.provider.sendAndConfirm(transaction, [signer]);
  }

  /**
   * Contribute to a pool
   */
  async contribute(
    params: types.ContributeParams,
    usdcMint: PublicKey,
    member?: Signer
  ): Promise<string> {
    const signer = member || this.provider.wallet;
    const { pool, escrow } = PDAHelpers.getPoolPDAs(params.poolId);
    const { member: memberPda } = PDAHelpers.getMemberPDAs(
      params.poolId,
      signer.publicKey
    );

    const memberTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      signer.publicKey
    );

    const instruction = this.program.methods
      .contribute(params.poolId)
      .accounts({
        member: signer.publicKey,
        pool: pool.pubkey,
        memberAccount: memberPda.pubkey,
        memberTokenAccount,
        escrowVault: escrow.pubkey,
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);

    return await this.provider.sendAndConfirm(transaction, [signer]);
  }

  /**
   * Disburse funds to recipient
   */
  async disburse(
    params: types.DisburseParams,
    usdcMint: PublicKey,
    creator: PublicKey,
    authority?: Signer
  ): Promise<string> {
    const signer = authority || this.provider.wallet;
    const { pool, escrow } = PDAHelpers.getPoolPDAs(params.poolId);
    const { member: memberPda } = PDAHelpers.getMemberPDAs(
      params.poolId,
      params.recipient
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      params.recipient
    );

    const instruction = this.program.methods
      .disburse(params.poolId, params.recipient)
      .accounts({
        authority: signer.publicKey,
        pool: pool.pubkey,
        creator,
        recipientTokenAccount,
        recipient: params.recipient,
        memberAccount: memberPda.pubkey,
        escrowVault: escrow.pubkey,
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);

    return await this.provider.sendAndConfirm(transaction, [signer]);
  }

  /**
   * Update member AI score
   */
  async updateMemberScore(
    params: types.UpdateMemberScoreParams,
    scoringAuthority?: Signer
  ): Promise<string> {
    const signer = scoringAuthority || this.provider.wallet;
    const { pool } = PDAHelpers.getPoolPDAs(params.poolId);
    const { member: memberPda } = PDAHelpers.getMemberPDAs(
      params.poolId,
      params.member
    );

    const instruction = this.program.methods
      .updateMemberScore(params.poolId, params.member, params.newScore)
      .accounts({
        scoringAuthority: signer.publicKey,
        pool: pool.pubkey,
        memberAccount: memberPda.pubkey,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);

    return await this.provider.sendAndConfirm(transaction, [signer]);
  }

  /**
   * Set new scoring authority
   */
  async setScoringAuthority(
    params: types.SetScoringAuthorityParams,
    creator?: Signer
  ): Promise<string> {
    const signer = creator || this.provider.wallet;
    const { pool } = PDAHelpers.getPoolPDAs(params.poolId);

    const instruction = this.program.methods
      .setScoringAuthority(params.poolId, params.newAuthority)
      .accounts({
        creator: signer.publicKey,
        pool: pool.pubkey,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);

    return await this.provider.sendAndConfirm(transaction, [signer]);
  }

  /**
   * Slash a defaulter
   */
  async slashDefaulter(
    params: types.SlashDefaulterParams,
    usdcMint: PublicKey,
    creator: PublicKey,
    authority?: Signer
  ): Promise<string> {
    const signer = authority || this.provider.wallet;
    const { pool, escrow } = PDAHelpers.getPoolPDAs(params.poolId);
    const { member: memberPda } = PDAHelpers.getMemberPDAs(
      params.poolId,
      params.member
    );

    const authorityTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      signer.publicKey
    );

    const instruction = this.program.methods
      .slashDefaulter(params.poolId, params.member)
      .accounts({
        authority: signer.publicKey,
        pool: pool.pubkey,
        creator,
        memberAccount: memberPda.pubkey,
        authorityTokenAccount,
        escrowVault: escrow.pubkey,
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);

    return await this.provider.sendAndConfirm(transaction, [signer]);
  }

  /**
   * Pause a pool
   */
  async pausePool(
    params: types.PausePoolParams,
    creator: PublicKey,
    authority?: Signer
  ): Promise<string> {
    const signer = authority || this.provider.wallet;
    const { pool } = PDAHelpers.getPoolPDAs(params.poolId);

    const instruction = this.program.methods
      .pausePool(params.poolId)
      .accounts({
        authority: signer.publicKey,
        pool: pool.pubkey,
        creator,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);

    return await this.provider.sendAndConfirm(transaction, [signer]);
  }

  /**
   * Resume a paused pool
   */
  async resumePool(
    params: types.ResumePoolParams,
    creator: PublicKey,
    authority?: Signer
  ): Promise<string> {
    const signer = authority || this.provider.wallet;
    const { pool } = PDAHelpers.getPoolPDAs(params.poolId);

    const instruction = this.program.methods
      .resumePool(params.poolId)
      .accounts({
        authority: signer.publicKey,
        pool: pool.pubkey,
        creator,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);

    return await this.provider.sendAndConfirm(transaction, [signer]);
  }

  /**
   * Emergency close a pool
   */
  async emergencyClose(
    params: types.EmergencyCloseParams,
    usdcMint: PublicKey,
    creator: PublicKey,
    authority?: Signer
  ): Promise<string> {
    const signer = authority || this.provider.wallet;
    const { pool, escrow } = PDAHelpers.getPoolPDAs(params.poolId);

    const creatorTokenAccount = await getAssociatedTokenAddress(usdcMint, creator);

    const instruction = this.program.methods
      .emergencyClose(params.poolId)
      .accounts({
        authority: signer.publicKey,
        pool: pool.pubkey,
        creator,
        creatorTokenAccount,
        escrowVault: escrow.pubkey,
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);

    return await this.provider.sendAndConfirm(transaction, [signer]);
  }

  /**
   * Get pool information
   */
  async getPool(poolId: number): Promise<types.Pool | null> {
    try {
      const { pool } = PDAHelpers.getPoolPDAs(poolId);
      const account = await this.program.account.pool.fetch(pool.pubkey);
      return account as types.Pool;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get member information
   */
  async getMember(poolId: number, wallet: PublicKey): Promise<types.Member | null> {
    try {
      const { member } = PDAHelpers.getMemberPDAs(poolId, wallet);
      const account = await this.program.account.member.fetch(member.pubkey);
      return account as types.Member;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all pools
   */
  async getAllPools(): Promise<types.Pool[]> {
    try {
      const pools = await this.program.account.pool.all();
      return pools.map((pool: any) => pool.account as types.Pool);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all members for a pool
   */
  async getPoolMembers(poolId: number): Promise<types.Member[]> {
    try {
      const { pool } = PDAHelpers.getPoolPDAs(poolId);
      const members = await this.program.account.member.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: pool.pubkey.toBase58(),
          },
        },
      ]);
      return members.map((member: any) => member.account as types.Member);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get pools for a specific creator
   */
  async getPoolsByCreator(creator: PublicKey): Promise<types.Pool[]> {
    try {
      const pools = await this.program.account.pool.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: creator.toBase58(),
          },
        },
      ]);
      return pools.map((pool: any) => pool.account as types.Pool);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get pools with filtering
   */
  async getPoolsWithFilter(filter: types.PoolFilter): Promise<types.Pool[]> {
    let pools = await this.getAllPools();

    if (filter.state) {
      pools = pools.filter((pool) => pool.poolState === filter.state);
    }

    if (filter.minContribution) {
      pools = pools.filter((pool) => pool.contributionAmount >= filter.minContribution!);
    }

    if (filter.maxContribution) {
      pools = pools.filter((pool) => pool.contributionAmount <= filter.maxContribution!);
    }

    if (filter.minMembers) {
      pools = pools.filter((pool) => pool.memberCount >= filter.minMembers!);
    }

    if (filter.maxMembers) {
      pools = pools.filter((pool) => pool.memberCount <= filter.maxMembers!);
    }

    if (filter.creator) {
      pools = pools.filter((pool) => pool.creator.equals(filter.creator!));
    }

    return pools;
  }

  /**
   * Calculate pool health score
   */
  calculatePoolHealth(pool: types.Pool, members: types.Member[]): number {
    if (members.length === 0) return 0;

    const activeMembers = members.filter((m) => m.activeStatus).length;
    const avgScore = members.reduce((sum, m) => sum + m.aiScore, 0) / members.length;
    const contributionRate = activeMembers / members.length;

    // Weighted health score (0-100)
    return Math.round(
      contributionRate * 40 + (avgScore / 100) * 30 + (pool.memberCount / pool.maxMembers) * 30
    );
  }

  /**
   * Get comprehensive pool information
   */
  async getPoolInfo(poolId: number): Promise<types.PoolInfo | null> {
    const pool = await this.getPool(poolId);
    if (!pool) return null;

    const members = await this.getPoolMembers(poolId);
    const healthScore = this.calculatePoolHealth(pool, members);
    const totalValue = pool.contributionAmount * pool.memberCount;

    // Calculate next payout time
    const currentTime = Date.now() / 1000;
    const cycleEndTime = pool.lastCycleAt + pool.cycleDuration;
    const nextPayoutIn = Math.max(0, cycleEndTime - currentTime);

    return {
      pool,
      members,
      healthScore,
      nextPayoutIn,
      totalValue,
    };
  }

  /**
   * Get member information with additional context
   */
  async getMemberInfo(poolId: number, wallet: PublicKey): Promise<types.MemberInfo | null> {
    const member = await this.getMember(poolId, wallet);
    if (!member) return null;

    const pool = await this.getPool(poolId);
    if (!pool) return null;

    const hasContributedThisCycle = member.contributionHistory.includes(pool.currentCycle);
    const contributionStatus = hasContributedThisCycle
      ? "up-to-date"
      : member.activeStatus
      ? "pending"
      : "missed";

    const cyclesUntilPayout = Math.max(0, pool.currentCycle - member.payoutReceived);
    const nextPayoutEligibility = cyclesUntilPayout;

    // Calculate reputation score based on contribution history and AI score
    const contributionConsistency = member.contributionHistory.length / Math.max(1, pool.currentCycle);
    const reputationScore = Math.round(
      member.aiScore * 0.7 + contributionConsistency * 30
    );

    return {
      member,
      contributionStatus,
      nextPayoutEligibility,
      reputationScore,
    };
  }
}
