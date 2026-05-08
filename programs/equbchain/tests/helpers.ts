import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

// Test provider setup
export const getProvider = () => {
  const connection = new Connection("http://localhost:8899", "confirmed");
  const wallet = Keypair.generate();
  
  return new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
};

// Test constants
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const TEST_POOL_ID = new PublicKey("11111111111111111111111111111111");
export const TEST_MEMBER = new PublicKey("22222222222222222222222222222");

// Helper functions
export const createTestPool = async (program: anchor.Program, creator: Keypair) => {
  const [poolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    [TEST_POOL_ID.toBuffer()],
    program.programId
  );

  await program.methods
    .initializePool({
      poolId: TEST_POOL_ID,
      contributionAmount: 100,
      cycleDuration: 7 * 24 * 60 * 60 * 1000,
      maxMembers: 5,
    })
    .accounts({
      pool: poolPDA,
      creator: creator.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([creator])
    .rpc();

  return { poolPDA };
};

export const createTestMember = async (
  program: anchor.Program,
  poolId: PublicKey,
  member: Keypair
) => {
  const [poolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    [poolId.toBuffer()],
    program.programId
  );

  const [memberPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("member")],
    [poolId.toBuffer(), member.publicKey.toBuffer()],
    program.programId
  );

  await program.methods
    .joinPool({
      poolId,
    })
    .accounts({
      pool: poolPDA,
      member: memberPDA,
      user: member.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([member])
    .rpc();

  return { memberPDA };
};

export const fundTestPool = async (
  program: anchor.Program,
  poolId: PublicKey,
  member: Keypair,
  amount: number
) => {
  const [poolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    [poolId.toBuffer()],
    program.programId
  );

  const [memberPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("member")],
    [poolId.toBuffer(), member.publicKey.toBuffer()],
    program.programId
  );

  await program.methods
    .contribute({
      poolId,
    })
    .accounts({
      pool: poolPDA,
      member: memberPDA,
      user: member.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .preInstructions([
      anchor.web3.createAssociatedTokenAccountInstruction(
        memberPDA,
        member.publicKey,
        USDC_MINT,
      ),
      anchor.web3.createTransferInstruction(
        USDC_MINT,
        member.publicKey,
        memberPDA,
        amount * 1_000_000, // Convert to USDC decimals
      ),
    ])
    .signers([member])
    .rpc();
};

// Mock data generators
export const generateMockPoolData = () => ({
  poolId: TEST_POOL_ID,
  contributionAmount: 100,
  cycleDuration: 7 * 24 * 60 * 60 * 1000,
  maxMembers: 5,
  memberCount: 0,
  currentCycle: 0,
  poolState: { forming: {} },
  totalValue: 0,
  creator: TEST_MEMBER,
  createdAt: Date.now(),
});

export const generateMockMemberData = () => ({
  poolId: TEST_POOL_ID,
  wallet: TEST_MEMBER,
  joinedAt: Date.now(),
  contributionHistory: [],
  totalContributed: 0,
  payoutReceived: 0,
  missedCycles: 0,
  aiScore: 50,
  activeStatus: true,
});

// Test utilities
export const expectError = async (promise: Promise<any>, errorMessage?: string) => {
  try {
    await promise;
    throw new Error("Expected promise to throw");
  } catch (error) {
    if (errorMessage && !error.message.includes(errorMessage)) {
      throw new Error(`Expected error message to contain "${errorMessage}", got "${error.message}"`);
    }
  }
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Event listeners
export const createEventListener = (
  program: anchor.Program,
  eventName: string,
  callback: (event: any, slot: any) => void
) => {
  return program.addEventListener(eventName, callback);
};

export const removeEventListener = (
  program: anchor.Program,
  listenerId: number
) => {
  program.removeEventListener(listenerId);
};
