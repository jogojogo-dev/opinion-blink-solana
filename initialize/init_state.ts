import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {Keypair, PublicKey} from "@solana/web3.js";
import { JogoVote } from "../target/types/jogo_vote";


async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.JogoVote as Program<JogoVote>;
    const payerSecretKeyString = process.env.PAYER_SECRET_KEY;
    if (!payerSecretKeyString) {
        throw new Error("PAYER_SECRET_KEY not found in .env file");
    }
    const payerSecretKey = new Uint8Array(JSON.parse(payerSecretKeyString));
    const payer = Keypair.fromSecretKey(payerSecretKey);
    const [stateAccountKey, stateAccountBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('state'), payer.publicKey.toBuffer()],
        program.programId
    );
    console.log(stateAccountKey.toBase58())
    const tx = await program.methods.initialize(4).accounts({
      state: stateAccountKey,
      admin: payer.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([payer]).rpc();
    console.log("Initialize transaction signature", tx);
}

main()
