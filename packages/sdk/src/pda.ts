import { PublicKey } from "@solana/web3.js";

export const POOL_SEED = "pool";
export const MEMBER_SEED = "member";
export const ESCROW_SEED = "escrow";

export class PDAHelpers {
  static programId: PublicKey;

  constructor(programId: PublicKey) {
    PDAHelpers.programId = programId;
  }

  /**
   * Derive pool PDA
   */
  static getPoolPDA(poolId: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(POOL_SEED), Buffer.from(poolId.toString())],
      PDAHelpers.programId
    );
  }

  /**
   * Derive member PDA
   */
  static getMemberPDA(pool: PublicKey, wallet: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(MEMBER_SEED), pool.toBuffer(), wallet.toBuffer()],
      PDAHelpers.programId
    );
  }

  /**
   * Derive escrow vault PDA
   */
  static getEscrowPDA(poolId: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), Buffer.from(poolId.toString())],
      PDAHelpers.programId
    );
  }

  /**
   * Get all PDAs for a given pool
   */
  static getPoolPDAs(poolId: number) {
    const [poolPda, poolBump] = this.getPoolPDA(poolId);
    const [escrowPda, escrowBump] = this.getEscrowPDA(poolId);

    return {
      pool: { pubkey: poolPda, bump: poolBump },
      escrow: { pubkey: escrowPda, bump: escrowBump },
    };
  }

  /**
   * Get member PDA for a specific pool
   */
  static getMemberPDAs(poolId: number, wallet: PublicKey) {
    const [poolPda] = this.getPoolPDA(poolId);
    const [memberPda, memberBump] = this.getMemberPDA(poolPda, wallet);

    return {
      pool: poolPda,
      member: { pubkey: memberPda, bump: memberBump },
    };
  }

  /**
   * Validate if a public key matches expected PDA
   */
  static validatePoolPDA(poolId: number, publicKey: PublicKey): boolean {
    const [expectedPda] = this.getPoolPDA(poolId);
    return expectedPda.equals(publicKey);
  }

  /**
   * Validate if a public key matches expected member PDA
   */
  static validateMemberPDA(pool: PublicKey, wallet: PublicKey, publicKey: PublicKey): boolean {
    const [expectedPda] = this.getMemberPDA(pool, wallet);
    return expectedPda.equals(publicKey);
  }

  /**
   * Validate if a public key matches expected escrow PDA
   */
  static validateEscrowPDA(poolId: number, publicKey: PublicKey): boolean {
    const [expectedPda] = this.getEscrowPDA(poolId);
    return expectedPda.equals(publicKey);
  }
}
