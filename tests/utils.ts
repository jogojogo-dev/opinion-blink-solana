import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JogoLottery } from "../target/types/jogo_lottery";
import { Account } from "@solana/spl-token";

export async function InitLotteryPool(
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

export async function EnterLotteryPool(
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

export async function PrepareDrawLottery(
  program: Program<JogoLottery>,
  admin: anchor.web3.Keypair,
  adminTokenAccount: Account,
  vaultTokenAccount: Account,
  recipientTokenAccount: Account,
  lotteryPool: anchor.web3.PublicKey,
  randomWinningNumber: number,
  bonusLotteryPrize: number,
  useSol: boolean
) {
  const tx = await program.methods
    .prepareDrawLottery(
      new anchor.BN(randomWinningNumber),
      new anchor.BN(bonusLotteryPrize),
      useSol
    )
    .accounts({
      admin: admin.publicKey,
      adminTokenAccount: adminTokenAccount.address,
      vaultTokenAccount: vaultTokenAccount.address,
      recipient: recipientTokenAccount.address,
      lotteryPool: lotteryPool,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([admin])
    .rpc();
  console.log("Draw lottery transaction signature", tx);
}

export async function claimPrizeFromLottery(
  program: Program<JogoLottery>,
  admin: anchor.web3.PublicKey,
  user: anchor.web3.Keypair,
  userTokenAccount: Account,
  vaultTokenAccount: Account,
  userLottery: anchor.web3.PublicKey,
  lotteryPoolPDA: anchor.web3.PublicKey,
  withPrize: boolean
) {
  const tx = await program.methods
    .claimPrize(withPrize)
    .accounts({
      admin: admin,
      owner: user.publicKey,
      lotteryPool: lotteryPoolPDA,
      vaultTokenAccount: vaultTokenAccount.address,
      userLottery: userLottery,
      userTokenAccount: userTokenAccount.address,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([user])
    .rpc();
  console.log("Claim prize transaction signature", tx);
}
