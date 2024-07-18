import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JogoLottery } from "../target/types/jogo_lottery";
import {
  Account,
  createWrappedNativeAccount,
  createSyncNativeInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert } from "chai";

async function InitLotteryPool(
  program: Program<JogoLottery>,
  admin: anchor.web3.Keypair,
  lotteryPool: anchor.web3.PublicKey,
  vaultTokenAccount: Account,
  mintAccount: anchor.web3.PublicKey,
  poolId: number[],
  maximumNumber: number,
  price: number,
  fee: number
) {
  const tx = await program.methods
    .initLotteryPool(
      poolId,
      new anchor.BN(maximumNumber),
      new anchor.BN(price),
      new anchor.BN(fee)
    )
    .accounts({
      admin: admin.publicKey,
      lotteryPool: lotteryPool,
      vaultTokenAccount: vaultTokenAccount.address,
      mintAccount: mintAccount,
    })
    .signers([admin])
    .rpc();
  console.log("Initialize transaction signature success: ", tx);
}

async function EnterLotteryPool(
  program: Program<JogoLottery>,
  user: anchor.web3.Keypair,
  lotteryPool: anchor.web3.PublicKey,
  userTokenAccount: anchor.web3.PublicKey,
  vaultTokenAccount: Account,
  userLottery: anchor.web3.PublicKey,
  voteNumber: number,
  buyLotteryNumbers: number,
  useSol: boolean
) {
  const tx = await program.methods
    .buyLotteryTicket(
      new anchor.BN(voteNumber),
      new anchor.BN(buyLotteryNumbers),
      useSol
    )
    .accounts({
      user: user.publicKey,
      lotteryPool: lotteryPool,
      vaultTokenAccount: vaultTokenAccount.address,
      userTokenAccount: userTokenAccount,
      userLottery: userLottery,
    })
    .signers([user])
    .rpc();
  console.log("BuyLotteryTicket transaction signature success: ", tx);
}

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

    it("Multiple buy lottery with sol", async () => {
      let vaultTokenAccountSOLBalanceBefore =
        await provider.connection.getBalance(vaultTokenAccount.address);
      for (let i = 0; i < 10; i++) {
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
      const lotteryPool = await program.account.lotteryPool.fetch(
        lotteryPoolPDA
      );
      assert.equal(
        lotteryPool.prize.toNumber(),
        10_000_000_000,
        "Total prize should be 10_000_000_000"
      );
      const vaultTokenAccountInfo =
        await provider.connection.getTokenAccountBalance(
          vaultTokenAccount.address
        );
      assert.equal(
        vaultTokenAccountInfo.value.amount,
        new anchor.BN(10_000_000_000).toString()
      );
      let vaultTokenAccountSOLBalanceAfter =
        await provider.connection.getBalance(vaultTokenAccount.address);
      assert.equal(
        vaultTokenAccountSOLBalanceAfter - vaultTokenAccountSOLBalanceBefore,
        10_000_000_000,
        "Vault token account SOL balance should be 10_000_000_000"
      );
    });
    it("Multiple buy lottery without sol", async () => {
      let userTokenAccounts: anchor.web3.PublicKey[] = []
      for (let i = 0; i < 10; i++) {
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
          const syncNativeInstruction = createSyncNativeInstruction(userTokenAccount)
          const messageV0 = new anchor.web3.TransactionMessage({
            payerKey: users[i].publicKey,
            recentBlockhash: latestBlockHash.blockhash,
            instructions: [transferInstruction, syncNativeInstruction],
          }).compileToV0Message();
          const transaction = new anchor.web3.VersionedTransaction(messageV0);
          transaction.sign([users[i]]);
          const signature = await provider.connection.sendTransaction(
              transaction,
              {skipPreflight: false}
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
        let userTokenAccountBalance = await provider.connection.getTokenAccountBalance(userTokenAccount)
        console.log(`${userTokenAccount} balance: ${userTokenAccountBalance.value.amount}`);
      }
      for (let i = 0; i < 10; i++) {
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
  });
});
