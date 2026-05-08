import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Equbchain } from "../target/types/equbchain";
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  mintTo,
} from "@solana/spl-token";
import { 
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

describe("EqubChain", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Equbchain as Program<Equbchain>;
  
  // Test accounts
  const creator = Keypair.generate();
  const member1 = Keypair.generate();
  const member2 = Keypair.generate();
  const member3 = Keypair.generate();
  
  // Test constants
  const POOL_ID = 1;
  const CONTRIBUTION_AMOUNT = 1_000_000; // 1 USDC (6 decimals)
  const CYCLE_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
  const MAX_MEMBERS = 10;
  
  let usdcMint: PublicKey;
  let pool: PublicKey;
  let escrowVault: PublicKey;

  before(async () => {
    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(creator.publicKey, 10 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(member1.publicKey, 10 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(member2.publicKey, 10 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(member3.publicKey, 10 * LAMPORTS_PER_SOL);

    // Wait for airdrops to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create USDC mint (for testing, we'll create a new mint)
    usdcMint = await createMint(provider.connection, creator, creator.publicKey, null, 6);
  });

  it("Initializes a pool", async () => {
    const [poolPda, poolBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from(POOL_ID.toString())],
      program.programId
    );

    const [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), Buffer.from(POOL_ID.toString())],
      program.programId
    );

    pool = poolPda;
    escrowVault = escrowPda;

    await program.methods
      .initializePool(POOL_ID, CONTRIBUTION_AMOUNT, CYCLE_DURATION, MAX_MEMBERS)
      .accounts({
        creator: creator.publicKey,
        pool: pool,
        escrowVault: escrowVault,
        usdcMint: usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    const poolAccount = await program.account.pool.fetch(pool);
    
    assert.equal(poolAccount.creator.toString(), creator.publicKey.toString());
    assert.equal(poolAccount.poolId, POOL_ID);
    assert.equal(poolAccount.contributionAmount, CONTRIBUTION_AMOUNT);
    assert.equal(poolAccount.cycleDuration, CYCLE_DURATION);
    assert.equal(poolAccount.maxMembers, MAX_MEMBERS);
    assert.equal(poolAccount.memberCount, 0);
    assert.equal(poolAccount.poolState.forming, {});
  });

  it("Members join the pool", async () => {
    // Member 1 joins
    const [member1Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), pool.toBuffer(), member1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .joinPool(POOL_ID)
      .accounts({
        member: member1.publicKey,
        pool: pool,
        creator: creator.publicKey,
        memberAccount: member1Pda,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([member1])
      .rpc();

    // Member 2 joins
    const [member2Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), pool.toBuffer(), member2.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .joinPool(POOL_ID)
      .accounts({
        member: member2.publicKey,
        pool: pool,
        creator: creator.publicKey,
        memberAccount: member2Pda,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([member2])
      .rpc();

    // Member 3 joins (this should activate the pool)
    const [member3Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), pool.toBuffer(), member3.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .joinPool(POOL_ID)
      .accounts({
        member: member3.publicKey,
        pool: pool,
        creator: creator.publicKey,
        memberAccount: member3Pda,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([member3])
      .rpc();

    const poolAccount = await program.account.pool.fetch(pool);
    assert.equal(poolAccount.memberCount, 3);
    assert.equal(poolAccount.poolState.active, {});
    assert.equal(poolAccount.currentCycle, 1);
  });

  it("Members contribute to the pool", async () => {
    // Mint USDC to members
    const member1TokenAccount = await getAssociatedTokenAddress(usdcMint, member1.publicKey);
    const member2TokenAccount = await getAssociatedTokenAddress(usdcMint, member2.publicKey);
    const member3TokenAccount = await getAssociatedTokenAddress(usdcMint, member3.publicKey);

    // Create token accounts if they don't exist
    const createTokenAccountTx = new Transaction();
    
    try {
      createTokenAccountTx.add(
        createAssociatedTokenAccountInstruction(
          member1.publicKey,
          member1TokenAccount,
          member1.publicKey,
          usdcMint
        )
      );
    } catch (e) {
      // Account already exists
    }

    try {
      createTokenAccountTx.add(
        createAssociatedTokenAccountInstruction(
          member2.publicKey,
          member2TokenAccount,
          member2.publicKey,
          usdcMint
        )
      );
    } catch (e) {
      // Account already exists
    }

    try {
      createTokenAccountTx.add(
        createAssociatedTokenAccountInstruction(
          member3.publicKey,
          member3TokenAccount,
          member3.publicKey,
          usdcMint
        )
      );
    } catch (e) {
      // Account already exists
    }

    await provider.sendAndConfirm(createTokenAccountTx, [member1, member2, member3]);

    // Mint tokens to members
    await mintTo(
      provider.connection,
      creator,
      usdcMint,
      member1TokenAccount,
      creator,
      CONTRIBUTION_AMOUNT * 2
    );

    await mintTo(
      provider.connection,
      creator,
      usdcMint,
      member2TokenAccount,
      creator,
      CONTRIBUTION_AMOUNT * 2
    );

    await mintTo(
      provider.connection,
      creator,
      usdcMint,
      member3TokenAccount,
      creator,
      CONTRIBUTION_AMOUNT * 2
    );

    // Member 1 contributes
    const [member1Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), pool.toBuffer(), member1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .contribute(POOL_ID)
      .accounts({
        member: member1.publicKey,
        pool: pool,
        memberAccount: member1Pda,
        memberTokenAccount: member1TokenAccount,
        escrowVault: escrowVault,
        usdcMint: usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([member1])
      .rpc();

    // Member 2 contributes
    const [member2Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), pool.toBuffer(), member2.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .contribute(POOL_ID)
      .accounts({
        member: member2.publicKey,
        pool: pool,
        memberAccount: member2Pda,
        memberTokenAccount: member2TokenAccount,
        escrowVault: escrowVault,
        usdcMint: usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([member2])
      .rpc();

    // Member 3 contributes
    const [member3Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), pool.toBuffer(), member3.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .contribute(POOL_ID)
      .accounts({
        member: member3.publicKey,
        pool: pool,
        memberAccount: member3Pda,
        memberTokenAccount: member3TokenAccount,
        escrowVault: escrowVault,
        usdcMint: usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([member3])
      .rpc();

    // Check escrow balance
    const escrowAccount = await getAccount(provider.connection, escrowVault);
    assert.equal(escrowAccount.amount, CONTRIBUTION_AMOUNT * 3);
  });

  it("Updates member scores", async () => {
    const [member1Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), pool.toBuffer(), member1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .updateMemberScore(POOL_ID, member1.publicKey, 85)
      .accounts({
        scoringAuthority: creator.publicKey,
        pool: pool,
        memberAccount: member1Pda,
      })
      .signers([creator])
      .rpc();

    const member1Account = await program.account.member.fetch(member1Pda);
    assert.equal(member1Account.aiScore, 85);
  });

  it("Pauses and resumes pool", async () => {
    await program.methods
      .pausePool(POOL_ID)
      .accounts({
        authority: creator.publicKey,
        pool: pool,
        creator: creator.publicKey,
      })
      .signers([creator])
      .rpc();

    let poolAccount = await program.account.pool.fetch(pool);
    assert.equal(poolAccount.poolState.paused, {});

    await program.methods
      .resumePool(POOL_ID)
      .accounts({
        authority: creator.publicKey,
        pool: pool,
        creator: creator.publicKey,
      })
      .signers([creator])
      .rpc();

    poolAccount = await program.account.pool.fetch(pool);
    assert.equal(poolAccount.poolState.active, {});
  });
});

// Helper function to create a mint
async function createMint(
  connection: Connection,
  payer: Keypair,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey | null,
  decimals: number
): Promise<PublicKey> {
  const mint = Keypair.generate();
  
  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: 82,
      lamports: await connection.getMinimumBalanceForRentExemption(82),
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mint.publicKey,
      mintAuthority,
      freezeAuthority,
      decimals
    )
  );

  await sendAndConfirmTransaction(connection, transaction, [payer, mint]);
  return mint.publicKey;
}

// Helper function to get account
async function getAccount(connection: Connection, address: PublicKey) {
  return await getAccountInfo(connection, address);
}

// Import missing functions
import {
  createInitializeMintInstruction,
  getAccountInfo,
  sendAndConfirmTransaction,
} from "@solana/spl-token";
