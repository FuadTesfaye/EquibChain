import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { getProvider } from "./helpers";

describe("EqubChain", () => {
  let program: Program;

  before(async () => {
    const provider = getProvider();
    program = anchor.workspace.Equbchain as Program;
  });

  describe("Pool Management", () => {
    it("Should initialize a pool", async () => {
      const poolId = new PublicKey("11111111111111111111111111111111");
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool")],
        [poolId.toBuffer()],
        program.programId
      );

      const contributionAmount = 100;
      const cycleDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
      const maxMembers = 10;

      try {
        await program.methods
          .initializePool({
            poolId,
            contributionAmount,
            cycleDuration,
            maxMembers,
          })
          .accounts({
            pool: poolPDA,
            creator: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        const poolAccount = await program.account.pool.fetch(poolPDA);
        
        expect(poolAccount.poolId.toString()).to.equal(poolId.toString());
        expect(poolAccount.contributionAmount).to.equal(contributionAmount);
        expect(poolAccount.cycleDuration).to.equal(cycleDuration);
        expect(poolAccount.maxMembers).to.equal(maxMembers);
        expect(poolAccount.memberCount).to.equal(0);
        expect(poolAccount.currentCycle).to.equal(0);
        expect(poolAccount.poolState).to.equal({ forming: {} });
        expect(poolAccount.totalValue).to.equal(0);
        expect(poolAccount.creator.toString()).to.equal(provider.wallet.publicKey.toString());
      } catch (error) {
        expect.fail(error);
      }
    });

    it("Should join a pool", async () => {
      const poolId = new PublicKey("11111111111111111111111111111111");
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool")],
        [poolId.toBuffer()],
        program.programId
      );

      // Initialize pool first
      await program.methods
        .initializePool({
          poolId,
          contributionAmount: 100,
          cycleDuration: 7 * 24 * 60 * 60 * 1000,
          maxMembers: 5,
        })
        .accounts({
          pool: poolPDA,
          creator: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const [memberPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("member")],
        [poolId.toBuffer(), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .joinPool({
            poolId,
          })
          .accounts({
            pool: poolPDA,
            member: memberPDA,
            user: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        const memberAccount = await program.account.member.fetch(memberPDA);
        
        expect(memberAccount.poolId.toString()).to.equal(poolId.toString());
        expect(memberAccount.wallet.toString()).to.equal(provider.wallet.publicKey.toString());
        expect(memberAccount.joinedAt).to.be.a("number");
        expect(memberAccount.contributionHistory).to.deep.equal([]);
        expect(memberAccount.totalContributed).to.equal(0);
        expect(memberAccount.payoutReceived).to.equal(0);
        expect(memberAccount.missedCycles).to.equal(0);
        expect(memberAccount.aiScore).to.equal(50); // Default score
        expect(memberAccount.activeStatus).to.be.true;

        const poolAccount = await program.account.pool.fetch(poolPDA);
        expect(poolAccount.memberCount).to.equal(1);
      } catch (error) {
        expect.fail(error);
      }
    });

    it("Should contribute to pool", async () => {
      const poolId = new PublicKey("11111111111111111111111111111111");
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool")],
        [poolId.toBuffer()],
        program.programId
      );

      // Initialize pool and join first
      await program.methods
        .initializePool({
          poolId,
          contributionAmount: 100,
          cycleDuration: 7 * 24 * 60 * 60 * 1000,
          maxMembers: 5,
        })
        .accounts({
          pool: poolPDA,
          creator: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const [memberPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("member")],
        [poolId.toBuffer(), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .joinPool({
          poolId,
        })
        .accounts({
          pool: poolPDA,
          member: memberPDA,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      try {
        await program.methods
          .contribute({
            poolId,
          })
          .accounts({
            pool: poolPDA,
            member: memberPDA,
            user: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .preInstructions([
            anchor.web3.createAssociatedTokenAccountInstruction(
              memberPDA,
              provider.wallet.publicKey,
              new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC mint
            ),
            anchor.web3.createTransferInstruction(
              new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC mint
              provider.wallet.publicKey,
              memberPDA,
              100 * 1_000_000, // 100 USDC with 6 decimals
            ),
          ])
          .rpc();

        const memberAccount = await program.account.member.fetch(memberPDA);
        const poolAccount = await program.account.pool.fetch(poolPDA);
        
        expect(memberAccount.contributionHistory).to.deep.equal([1]);
        expect(memberAccount.totalContributed).to.equal(100 * 1_000_000);
        expect(poolAccount.totalValue).to.equal(100 * 1_000_000);
      } catch (error) {
        expect.fail(error);
      }
    });

    it("Should disburse to member", async () => {
      const poolId = new PublicKey("11111111111111111111111111111111");
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool")],
        [poolId.toBuffer()],
        program.programId
      );

      // Initialize pool with enough members for disbursement
      await program.methods
        .initializePool({
          poolId,
          contributionAmount: 100,
          cycleDuration: 7 * 24 * 60 * 60 * 1000,
          maxMembers: 3,
        })
        .accounts({
          pool: poolPDA,
          creator: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Add two members
      for (let i = 0; i < 3; i++) {
        const memberKey = new PublicKey(`11111111111111111111111111111${i}`);
        const [memberPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("member")],
          [poolId.toBuffer(), memberKey.toBuffer()],
          program.programId
        );

        await program.methods
          .joinPool({
            poolId,
          })
          .accounts({
            pool: poolPDA,
            member: memberPDA,
            user: memberKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        if (i < 2) {
          await program.methods
            .contribute({
              poolId,
            })
            .accounts({
              pool: poolPDA,
              member: memberPDA,
              user: memberKey,
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .preInstructions([
              anchor.web3.createAssociatedTokenAccountInstruction(
                memberPDA,
                memberKey,
                new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
              ),
              anchor.web3.createTransferInstruction(
                new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
                memberKey,
                memberPDA,
                100 * 1_000_000,
              ),
            ])
            .rpc();
        }
      }

      try {
        await program.methods
          .disburse({
            poolId,
            recipient: new PublicKey("111111111111111111111111111110"), // First member
          })
          .accounts({
            pool: poolPDA,
            creator: provider.wallet.publicKey,
            recipient: new PublicKey("111111111111111111111111111110"),
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .preInstructions([
            anchor.web3.createAssociatedTokenAccountInstruction(
              new PublicKey("111111111111111111111111111110"),
              provider.wallet.publicKey,
              new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
            ),
          ])
          .rpc();

        const poolAccount = await program.account.pool.fetch(poolPDA);
        expect(poolAccount.currentCycle).to.equal(1);
      } catch (error) {
        expect.fail(error);
      }
    });
  });

  describe("Member Management", () => {
    it("Should update member score", async () => {
      const poolId = new PublicKey("11111111111111111111111111111111");
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool")],
        [poolId.toBuffer()],
        program.programId
      );

      // Initialize pool
      await program.methods
        .initializePool({
          poolId,
          contributionAmount: 100,
          cycleDuration: 7 * 24 * 60 * 60 * 1000,
          maxMembers: 5,
        })
        .accounts({
          pool: poolPDA,
          creator: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const [memberPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("member")],
        [poolId.toBuffer(), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      // Set scoring authority
      await program.methods
        .setScoringAuthority({
          poolId,
          newAuthority: provider.wallet.publicKey,
        })
        .accounts({
          pool: poolPDA,
          creator: provider.wallet.publicKey,
        })
        .rpc();

      try {
        await program.methods
          .updateMemberScore({
            poolId,
            member: provider.wallet.publicKey,
            newScore: 85,
          })
          .accounts({
            pool: poolPDA,
            member: memberPDA,
            authority: provider.wallet.publicKey,
          })
          .rpc();

        const memberAccount = await program.account.member.fetch(memberPDA);
        expect(memberAccount.aiScore).to.equal(85);
      } catch (error) {
        expect.fail(error);
      }
    });

    it("Should slash defaulter", async () => {
      const poolId = new PublicKey("11111111111111111111111111111111");
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool")],
        [poolId.toBuffer()],
        program.programId
      );

      // Initialize pool
      await program.methods
        .initializePool({
          poolId,
          contributionAmount: 100,
          cycleDuration: 7 * 24 * 60 * 60 * 1000,
          maxMembers: 5,
        })
        .accounts({
          pool: poolPDA,
          creator: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const defaulterKey = new PublicKey("111111111111111111111111111110");
      const [defaulterPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("member")],
        [poolId.toBuffer(), defaulterKey.toBuffer()],
        program.programId
      );

      // Add defaulter and make them contribute
      await program.methods
        .joinPool({
          poolId,
        })
        .accounts({
          pool: poolPDA,
          member: defaulterPDA,
          user: defaulterKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Advance cycles to create missed cycles
      for (let i = 0; i < 3; i++) {
        await program.methods
          .disburse({
            poolId,
            recipient: new PublicKey("11111111111111111111111111111111"), // Creator
          })
          .accounts({
            pool: poolPDA,
            creator: provider.wallet.publicKey,
            recipient: new PublicKey("11111111111111111111111111111"),
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
      }

      try {
        await program.methods
          .slashDefaulter({
            poolId,
            member: defaulterKey,
          })
          .accounts({
            pool: poolPDA,
            creator: provider.wallet.publicKey,
            member: defaulterPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .preInstructions([
            anchor.web3.createAssociatedTokenAccountInstruction(
              new PublicKey("111111111111111111111111111110"),
              provider.wallet.publicKey,
              new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
            ),
            anchor.web3.createTransferInstruction(
              new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
              defaulterPDA,
              provider.wallet.publicKey,
              50 * 1_000_000, // 50% slash
            ),
          ])
          .rpc();

        const memberAccount = await program.account.member.fetch(defaulterPDA);
        expect(memberAccount.activeStatus).to.be.false;
        expect(memberAccount.missedCycles).to.equal(1);
      } catch (error) {
        expect.fail(error);
      }
    });
  });

  describe("Pool State Management", () => {
    it("Should pause and resume pool", async () => {
      const poolId = new PublicKey("11111111111111111111111111111111");
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool")],
        [poolId.toBuffer()],
        program.programId
      );

      // Initialize pool
      await program.methods
        .initializePool({
          poolId,
          contributionAmount: 100,
          cycleDuration: 7 * 24 * 60 * 60 * 1000,
          maxMembers: 5,
        })
        .accounts({
          pool: poolPDA,
          creator: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      try {
        // Pause pool
        await program.methods
          .pausePool({
            poolId,
          })
          .accounts({
            pool: poolPDA,
            creator: provider.wallet.publicKey,
          })
          .rpc();

        let poolAccount = await program.account.pool.fetch(poolPDA);
        expect(poolAccount.poolState).to.equal({ paused: {} });

        // Resume pool
        await program.methods
          .resumePool({
            poolId,
          })
          .accounts({
            pool: poolPDA,
            creator: provider.wallet.publicKey,
          })
          .rpc();

        poolAccount = await program.account.pool.fetch(poolPDA);
        expect(poolAccount.poolState).to.equal({ active: {} });
      } catch (error) {
        expect.fail(error);
      }
    });

    it("Should emergency close pool", async () => {
      const poolId = new PublicKey("11111111111111111111111111111111");
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool")],
        [poolId.toBuffer()],
        program.programId
      );

      // Initialize pool with some funds
      await program.methods
        .initializePool({
          poolId,
          contributionAmount: 100,
          cycleDuration: 7 * 24 * 60 * 60 * 1000,
          maxMembers: 5,
        })
        .accounts({
          pool: poolPDA,
          creator: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Add member and contribute
      const memberKey = new PublicKey("111111111111111111111111111110");
      const [memberPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("member")],
        [poolId.toBuffer(), memberKey.toBuffer()],
        program.programId
      );

      await program.methods
        .joinPool({
          poolId,
        })
        .accounts({
          pool: poolPDA,
          member: memberPDA,
          user: memberKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .contribute({
          poolId,
        })
        .accounts({
          pool: poolPDA,
          member: memberPDA,
          user: memberKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .preInstructions([
          anchor.web3.createAssociatedTokenAccountInstruction(
            memberPDA,
            memberKey,
            new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
          ),
          anchor.web3.createTransferInstruction(
            new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
            memberKey,
            memberPDA,
            100 * 1_000_000,
          ),
        ])
        .rpc();

      try {
        await program.methods
          .emergencyClose({
            poolId,
          })
          .accounts({
            pool: poolPDA,
            creator: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .preInstructions([
            anchor.web3.createCloseAccountInstruction(memberPDA),
          ])
          .rpc();

        const poolAccount = await program.account.pool.fetch(poolPDA);
        expect(poolAccount.poolState).to.equal({ completed: {} });
      } catch (error) {
        expect.fail(error);
      }
    });
  });

  describe("Error Handling", () => {
    it("Should fail to initialize pool with invalid parameters", async () => {
      const poolId = new PublicKey("11111111111111111111111111111");
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool")],
        [poolId.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .initializePool({
            poolId,
            contributionAmount: 0, // Invalid: zero contribution
            cycleDuration: 7 * 24 * 60 * 60 * 1000,
            maxMembers: 0, // Invalid: zero max members
          })
          .accounts({
            pool: poolPDA,
            creator: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.be.an("error");
      }
    });

    it("Should fail to join non-existent pool", async () => {
      const nonExistentPoolId = new PublicKey("22222222222222222222222222222");
      const [memberPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("member")],
        [nonExistentPoolId.toBuffer(), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .joinPool({
            poolId: nonExistentPoolId,
          })
          .accounts({
            pool: PublicKey.findProgramAddressSync(
              [Buffer.from("pool")],
              [nonExistentPoolId.toBuffer()],
              program.programId
            ),
            member: memberPDA,
            user: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.be.an("error");
      }
    });
  });

  describe("Events", () => {
    it("Should emit events on pool operations", async () => {
      const poolId = new PublicKey("11111111111111111111111111111");
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool")],
        [poolId.toBuffer()],
        program.programId
      );

      // Listen for events
      const eventListener = program.addEventListener("PoolInitialized", (event, slot) => {
        expect(event.poolId.toString()).to.equal(poolId.toString());
        expect(event.contributionAmount).to.equal(100);
        expect(event.cycleDuration).to.equal(7 * 24 * 60 * 60 * 1000);
        expect(event.maxMembers).to.equal(5);
        expect(event.creator.toString()).to.equal(provider.wallet.publicKey.toString());
      });

      await program.methods
        .initializePool({
          poolId,
          contributionAmount: 100,
          cycleDuration: 7 * 24 * 60 * 60 * 1000,
          maxMembers: 5,
        })
        .accounts({
          pool: poolPDA,
          creator: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Wait for event to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clean up
      program.removeEventListener(eventListener);
    });
  });
});
