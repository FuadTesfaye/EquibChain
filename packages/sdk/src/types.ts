import { PublicKey } from "@solana/web3.js";

export interface Pool {
  creator: PublicKey;
  poolId: number;
  contributionAmount: number;
  cycleDuration: number;
  maxMembers: number;
  currentCycle: number;
  memberCount: number;
  poolState: PoolState;
  escrowVault: PublicKey;
  scoringAuthority: PublicKey;
  createdAt: number;
  lastCycleAt: number;
  bump: number;
}

export enum PoolState {
  Forming = "forming",
  Active = "active",
  Completed = "completed",
  Paused = "paused",
}

export interface Member {
  wallet: PublicKey;
  pool: PublicKey;
  aiScore: number;
  contributionHistory: number[];
  missedCycles: number;
  totalContributed: number;
  payoutReceived: number;
  activeStatus: boolean;
  joinedAt: number;
  lastContributionAt: number;
  bump: number;
}

export interface CreatePoolParams {
  poolId: number;
  contributionAmount: number;
  cycleDuration: number;
  maxMembers: number;
}

export interface JoinPoolParams {
  poolId: number;
}

export interface ContributeParams {
  poolId: number;
}

export interface DisburseParams {
  poolId: number;
  recipient: PublicKey;
}

export interface UpdateMemberScoreParams {
  poolId: number;
  member: PublicKey;
  newScore: number;
}

export interface SetScoringAuthorityParams {
  poolId: number;
  newAuthority: PublicKey;
}

export interface SlashDefaulterParams {
  poolId: number;
  member: PublicKey;
}

export interface PausePoolParams {
  poolId: number;
}

export interface ResumePoolParams {
  poolId: number;
}

export interface EmergencyCloseParams {
  poolId: number;
}

export interface PoolFilter {
  state?: PoolState;
  minContribution?: number;
  maxContribution?: number;
  minMembers?: number;
  maxMembers?: number;
  creator?: PublicKey;
}

export interface PoolInfo {
  pool: Pool;
  members: Member[];
  healthScore: number;
  nextPayoutIn: number;
  totalValue: number;
}

export interface MemberInfo {
  member: Member;
  contributionStatus: "up-to-date" | "missed" | "pending";
  nextPayoutEligibility: number;
  reputationScore: number;
}
