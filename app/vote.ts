import {
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
    SystemProgram, Keypair, Connection
} from '@solana/web3.js';
import BN from "bn.js"
import dotenv from 'dotenv';
import {sha256} from "crypto-hash";

const connection = new Connection("http://localhost:8899")
const voteProgramId = new PublicKey("62TKbRM9rPsUu5kKeGUkoqP5M4CyLiVSogfaVT1uJFLQ")
const stateAccount = new PublicKey("5QsxJuht8VuDfkf45RDj1Mw6su547NGCDE37pDwZ5xce")
const payerSecretKeyString = process.env.PAYER_SECRET_KEY;
if (!payerSecretKeyString) {
    throw new Error("PAYER_SECRET_KEY not found in .env file");
}
const payerSecretKey = new Uint8Array(JSON.parse(payerSecretKeyString));
export const payer = Keypair.fromSecretKey(payerSecretKey);

async function getDiscriminator(name: string): Promise<Buffer> {
    const discriminator = await sha256(`global:${name}`);
    return Buffer.from(discriminator.slice(0, 16), 'hex');
}

export async function voteTransaction(
    voter: PublicKey,
    voteNumber: number,
) {
    const recentBlockhash = await connection
        .getLatestBlockhash({commitment: 'max'})
    const [voteAccountPDA, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("vote_account"), voter.toBuffer()],
        voteProgramId
    )
    const discriminator = await getDiscriminator("vote");
    const data = Buffer.concat([
        discriminator,
        Buffer.from(new Uint8Array((new BN(voteNumber)).toArray('le', 4)))
    ])
    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: stateAccount, isSigner: false, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: voter, isSigner: true, isWritable: false },
            { pubkey: voteAccountPDA, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: voteProgramId,
        data: data,
    });
    const messageV0 = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: recentBlockhash.blockhash,
        instructions: [instruction],
    }).compileToV0Message();
    const signedTransaction = new VersionedTransaction(messageV0);
    signedTransaction.sign([payer]);
    return signedTransaction;
}

async function vote() {
    const user0 = Keypair.generate();
    const voteNumber = 2;
    const tx = await voteTransaction(user0.publicKey, voteNumber);
    tx.sign([user0])
    try {
        const txid = await connection.sendRawTransaction(tx.serialize());
        console.log('Transaction ID:', txid);
        const latestBlockHash = await connection.getLatestBlockhash()
        const strategy = {
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: txid,
        }
        const confirmation = await connection.confirmTransaction(strategy, 'confirmed');
        console.log('Transaction confirmed:', confirmation);
    } catch (e) {
        console.log(e)
    }
}

vote()