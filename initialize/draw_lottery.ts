import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import { JogoLottery } from "../target/types/jogo_lottery";

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.JogoLottery as Program<JogoLottery>;
    const admin = provider.wallet as anchor.Wallet
    const encoder = new TextEncoder();
    const poolId = Array.from(encoder.encode("euro2024".padEnd(32, '\0')));
    const [lotteryPoolPDA, lotteryPoolBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("lottery_pool"),
            admin.publicKey.toBuffer(),
            Buffer.from(poolId)
        ],
        program.programId
    )
    console.log(`LotteryPool: ${lotteryPoolPDA.toBase58()}`)
    const [lotteryPoolVaultPDA, lotteryPoolVaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("lottery_pool_sol"),
            admin.publicKey.toBuffer(),
            lotteryPoolPDA.toBuffer(),
        ],
        program.programId
    )
    console.log(`LotteryPoolVault: ${lotteryPoolVaultPDA.toBase58()}`)
    const tx = await program.methods.prepareDrawLottery(new anchor.BN(2), new anchor.BN(67_000_000_000)).accounts({
        admin: admin.publicKey,
        vaultAccount: lotteryPoolVaultPDA,
        lotteryPool:lotteryPoolPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([admin.payer]).rpc();
    console.log("Draw lottery transaction signature", tx);
}

main()
