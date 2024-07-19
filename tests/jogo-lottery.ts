import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JogoLottery } from "../target/types/jogo_lottery";
import {
  Account,
  createSyncNativeInstruction,
  createWrappedNativeAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import {
  claimPrizeFromLottery,
  EnterLotteryPool,
  InitLotteryPool,
  PrepareDrawLottery,
} from "./utils";

describe("jogo-lottery", () => {
  const admin = anchor.web3.Keypair.generate();
  const users = Array.from({ length: 20 }, () =>
    anchor.web3.Keypair.generate()
  );
  const wrappedSol = new anchor.web3.PublicKey(
    "So11111111111111111111111111111111111111112"
  );
  const LOTTERY_POOL_CONST = "lottery_pool";
  const USER_LOTTERY_CONST = "user_lottery";

  describe("use wrapped sol", async () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.JogoLottery as Program<JogoLottery>;
    const provider = program.provider;

    const encoder = new TextEncoder();
    const poolId = Array.from(encoder.encode("euro2024".padEnd(32, "\0")));
    const mintAccount = wrappedSol;
    const [lotteryPoolPDA, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(LOTTERY_POOL_CONST),
        admin.publicKey.toBuffer(),
        Buffer.from(poolId),
      ],
      program.programId
    );
    let vaultTokenAccount: Account;
    let adminTokenAccount: Account;
    before(async () => {
      const tx = await provider.connection.requestAirdrop(
        admin.publicKey,
        1000_000_000_000
      );
      const latestBlockHash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction(
        {
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature: tx,
        },
        "confirmed"
      );
      for (let i = 0; i < users.length; i++) {
        const tx = await provider.connection.requestAirdrop(
          users[i].publicKey,
          10_000_000_000
        );
        const latestBlockHash = await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction(
          {
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: tx,
          },
          "confirmed"
        );
      }

      vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        admin,
        mintAccount,
        lotteryPoolPDA,
        true
      );
      adminTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        admin,
        mintAccount,
        admin.publicKey,
        true
      );
    });

    it("Initialize LotteryPool", async () => {
      await InitLotteryPool(
        program,
        admin,
        lotteryPoolPDA,
        vaultTokenAccount,
        mintAccount,
        poolId,
        4,
        1_000_000_000,
        200
      );
    });

    const userNumbers = 20;
    let userCostTotal = 0;

    it("Multiple buy lottery with sol", async () => {
      let vaultTokenAccountSOLBalanceBefore =
        await provider.connection.getBalance(vaultTokenAccount.address);
      for (let i = 0; i < userNumbers; i++) {
        userCostTotal += 1_000_000_000;
        const randomVoteNumber = Math.floor(Math.random() * 4) + 1;
        const [userLotteryPDA, _] =
          anchor.web3.PublicKey.findProgramAddressSync(
            [
              Buffer.from(USER_LOTTERY_CONST),
              lotteryPoolPDA.toBuffer(),
              users[i].publicKey.toBuffer(),
              Buffer.from([randomVoteNumber]),
            ],
            program.programId
          );
        const userTokenAccount = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          users[i],
          mintAccount,
          users[i].publicKey,
          true
        );
        await EnterLotteryPool(
          program,
          users[i],
          lotteryPoolPDA,
          userTokenAccount.address,
          vaultTokenAccount,
          userLotteryPDA,
          randomVoteNumber,
          1,
          true
        );
      }
      const lotteryPoolData = await program.account.lotteryPool.fetch(
        lotteryPoolPDA
      );
      assert.equal(
        lotteryPoolData.prize.toNumber(),
        userCostTotal,
        `Total prize should be ${userCostTotal.toString()}`
      );
      const vaultTokenAccountInfo =
        await provider.connection.getTokenAccountBalance(
          vaultTokenAccount.address
        );
      assert.equal(
        vaultTokenAccountInfo.value.amount,
        new anchor.BN(userCostTotal).toString()
      );
      let vaultTokenAccountSOLBalanceAfter =
        await provider.connection.getBalance(vaultTokenAccount.address);
      assert.equal(
        vaultTokenAccountSOLBalanceAfter - vaultTokenAccountSOLBalanceBefore,
        userCostTotal,
        `Vault token account SOL balance should be ${userCostTotal.toString()}`
      );
    });

    it("Multiple buy lottery without sol", async () => {
      let userTokenAccounts: anchor.web3.PublicKey[] = [];
      for (let i = 0; i < userNumbers; i++) {
        userCostTotal += 1_000_000_000;
        let userTokenAccount;
        try {
          userTokenAccount = await createWrappedNativeAccount(
            provider.connection,
            users[i],
            users[i].publicKey,
            1_000_000_000
          );
        } catch (e) {
          const userTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            users[i],
            mintAccount,
            users[i].publicKey,
            true
          );
          userTokenAccount = userTokenAccountInfo.address;
          const latestBlockHash =
            await provider.connection.getLatestBlockhash();
          const transferInstruction = anchor.web3.SystemProgram.transfer({
            fromPubkey: users[i].publicKey,
            toPubkey: userTokenAccount,
            lamports: 1_000_000_000,
          });
          const syncNativeInstruction =
            createSyncNativeInstruction(userTokenAccount);
          const messageV0 = new anchor.web3.TransactionMessage({
            payerKey: users[i].publicKey,
            recentBlockhash: latestBlockHash.blockhash,
            instructions: [transferInstruction, syncNativeInstruction],
          }).compileToV0Message();
          const transaction = new anchor.web3.VersionedTransaction(messageV0);
          transaction.sign([users[i]]);
          const signature = await provider.connection.sendTransaction(
            transaction,
            { skipPreflight: false }
          );
          await provider.connection.confirmTransaction(
            {
              blockhash: latestBlockHash.blockhash,
              lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
              signature: signature,
            },
            "confirmed"
          );
          console.log("Transfer SOL to userTokenAccount success: ", signature);
        }
        userTokenAccounts.push(userTokenAccount);
        let userTokenAccountBalance =
          await provider.connection.getTokenAccountBalance(userTokenAccount);
        console.log(
          `${userTokenAccount} balance: ${userTokenAccountBalance.value.amount}`
        );
      }
      for (let i = 0; i < userNumbers; i++) {
        const randomVoteNumber = Math.floor(Math.random() * 4) + 1;
        const [userLotteryPDA, _] =
          anchor.web3.PublicKey.findProgramAddressSync(
            [
              Buffer.from(USER_LOTTERY_CONST),
              lotteryPoolPDA.toBuffer(),
              users[i].publicKey.toBuffer(),
              Buffer.from([randomVoteNumber]),
            ],
            program.programId
          );

        await EnterLotteryPool(
          program,
          users[i],
          lotteryPoolPDA,
          userTokenAccounts[i],
          vaultTokenAccount,
          userLotteryPDA,
          randomVoteNumber,
          1,
          false
        );
      }
    });

    it("Draw LotteryPool", async () => {
      const recipient = anchor.web3.Keypair.generate();
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        admin,
        mintAccount,
        recipient.publicKey,
        true
      );
      let recipientBalanceBefore =
        await program.provider.connection.getTokenAccountBalance(
          recipientTokenAccount.address
        );
      let randomWinningNumber = Math.floor(Math.random() * 4) + 1;

      assert.equal(
        Number(recipientBalanceBefore.value.amount),
        0,
        "Recipient balance should be zero"
      );
      let lotteryPoolData = await program.account.lotteryPool.fetch(
        lotteryPoolPDA
      );
      assert.equal(
        lotteryPoolData.isDrawn,
        false,
        "Lottery pool should not be drawn"
      );
      assert.equal(randomWinningNumber != 0, true, "Can not be zero");

      await PrepareDrawLottery(
        program,
        admin,
        adminTokenAccount,
        vaultTokenAccount,
        recipientTokenAccount,
        lotteryPoolPDA,
        randomWinningNumber,
        500_000_000_000,
        true
      );

      lotteryPoolData = await program.account.lotteryPool.fetch(lotteryPoolPDA);
      let recipientBalanceAfter =
        await program.provider.connection.getTokenAccountBalance(
          recipientTokenAccount.address
        );
      let fee = new anchor.BN(500_000_000_000)
        .add(new anchor.BN(userCostTotal))
        .mul(new anchor.BN(200))
        .div(new anchor.BN(1000));
      assert.equal(
        Number(recipientBalanceAfter.value.amount),
        fee.toNumber(),
        `Recipient balance should be ${fee.toNumber()}`
      );
      assert.equal(
        lotteryPoolData.isDrawn,
        true,
        "Lottery pool should be drawn"
      );
      assert.equal(
        lotteryPoolData.winningNumber.toNumber(),
        randomWinningNumber,
        `Winning number should be ${randomWinningNumber}`
      );
    });

    it("Claim Prize", async () => {
      let lotteryPoolData = await program.account.lotteryPool.fetch(
        lotteryPoolPDA
      );
      let prize = lotteryPoolData.prize;
      let bonusPrize = lotteryPoolData.bonusPrize;
      let votesPrize = lotteryPoolData.votesPrize;
      for (let i = 0; i < userNumbers; i++) {
        let userLottery: anchor.web3.PublicKey;
        try {
          const [userLotteryPDA, userLotteryBump] =
            anchor.web3.PublicKey.findProgramAddressSync(
              [
                Buffer.from(USER_LOTTERY_CONST),
                lotteryPoolPDA.toBuffer(),
                users[i].publicKey.toBuffer(),
                Buffer.from([lotteryPoolData.winningNumber.toNumber()]),
              ],
              program.programId
            );
          const userLotteryData = await program.account.userLottery.fetch(
            userLotteryPDA
          );
          if (userLotteryData.balance.toNumber() == 0) continue;
          userLottery = userLotteryPDA;
        } catch (e) {
          continue;
        }

        const userTokenAccount = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          users[i],
          mintAccount,
          users[i].publicKey,
          true
        );

        const userTokenAccountBalanceBefore =
          await provider.connection.getTokenAccountBalance(
            userTokenAccount.address
          );
        await claimPrizeFromLottery(
          program,
          admin.publicKey,
          users[i],
          userTokenAccount,
          vaultTokenAccount,
          userLottery,
          lotteryPoolPDA,
          true
        );
        const userLotteryData = await program.account.userLottery.fetch(
          userLottery
        );
        const claimedReward = userLotteryData.balance
          .mul(prize.add(bonusPrize))
          .div(votesPrize[lotteryPoolData.winningNumber.toNumber()]);
        const actualReward = claimedReward.sub(
          claimedReward.mul(new anchor.BN(200)).div(new anchor.BN(1000))
        );
        assert.isAtMost(
          userLotteryData.claimedPrize
            .sub(
              userLotteryData.claimedPrize
                .mul(new anchor.BN(200))
                .div(new anchor.BN(1000))
            )
            .toNumber(),
          actualReward.toNumber(),
          "Claim reward should be equal to balance"
        );
        const userTokenAccountBalanceAfter =
          await provider.connection.getTokenAccountBalance(
            userTokenAccount.address
          );
        assert.equal(
          Number(userTokenAccountBalanceAfter.value.amount) -
            Number(userTokenAccountBalanceBefore.value.amount),
          actualReward.toNumber(),
          `User token account diff balance should be ${claimedReward.toString()}`
        );
      }
    });
  });
});
