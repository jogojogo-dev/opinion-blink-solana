import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JogoLottery } from "../target/types/jogo_lottery";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

const mintAccount = new anchor.web3.PublicKey(
  "So11111111111111111111111111111111111111112"
);

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.JogoLottery as Program<JogoLottery>;
  const admin = provider.wallet as anchor.Wallet;
  const encoder = new TextEncoder();
  const poolId = Array.from(encoder.encode("euro2024".padEnd(32, "\0")));
  const [lotteryPoolPDA, lotteryPoolBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("lottery_pool"),
        admin.publicKey.toBuffer(),
        Buffer.from(poolId),
      ],
      program.programId
    );
  console.log(`LotteryPool: ${lotteryPoolPDA.toBase58()}`);
  const vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    admin.payer,
    mintAccount,
    lotteryPoolPDA,
    true
  );
  console.log(`vaultTokenAccount: ${vaultTokenAccount.address.toBase58()}`);
  const tx = await program.methods
    .initLotteryPool(
      poolId,
      new anchor.BN(4),
      new anchor.BN(10_000_000),
      new anchor.BN(10)
    )
    .accounts({
      admin: admin.publicKey,
      vaultTokenAccount: vaultTokenAccount.address,
      mintAccount: mintAccount,
      lotteryPool: lotteryPoolPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([admin.payer])
    .rpc({
      commitment: "confirmed"
    });
  console.log("Initialize transaction signature", tx);
}

main();
