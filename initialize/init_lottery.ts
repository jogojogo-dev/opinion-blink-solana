import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {Keypair, PublicKey} from "@solana/web3.js";
import { JogoLottery } from "../target/types/jogo_lottery";


async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.JogoLottery as Program<JogoLottery>;
    const admin = provider.wallet as anchor.Wallet
    const encoder = new TextEncoder();
    const poolId = Array.from(encoder.encode("euro2024".padEnd(32, '\0')));
    const deadline = new Date().getTime() + 1000 * 60 * 60 * 24 * 7;
    const [lotteryPoolPDA, lotteryPoolBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("lottery_pool"),
            admin.publicKey.toBuffer(),
            Buffer.from(poolId)
        ],
        program.programId
    )
    const [lotteryPoolVaultPDA, lotteryPoolVaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("lottery_pool_sol"),
            admin.publicKey.toBuffer(),
            lotteryPoolPDA.toBuffer(),
        ],
        program.programId
    )
    const tx = await program.methods.initLotteryPool(poolId, new anchor.BN(4), new anchor.BN(deadline)).accounts({
        admin: admin.publicKey,
        vaultAccount: lotteryPoolVaultPDA,
        lotteryPool:lotteryPoolPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([admin.payer]).rpc();
    console.log("Initialize transaction signature", tx);
}

main()