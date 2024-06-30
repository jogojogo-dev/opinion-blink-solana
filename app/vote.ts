import {
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
    SystemProgram, Keypair, Connection
} from '@solana/web3.js';
import BN from "bn.js"
import {sha256} from "crypto-hash";
import * as borsh from 'borsh';
import * as anchor from "@coral-xyz/anchor";
import * as path from "node:path";
import * as fs from "node:fs";

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

class VoteAccount {
    voter: PublicKey;
    votedNumber: number;
    isVoted: boolean;
    bump: number;

    constructor(properties: { voter: Uint8Array, votedNumber: number, isVoted: number, bump: number }) {
        this.voter = new PublicKey(properties.voter);
        this.votedNumber = properties.votedNumber;
        this.isVoted = properties.isVoted === 1; // convert to boolean
        this.bump = properties.bump;
    }

    static schema: borsh.Schema = new Map([
        [VoteAccount, {
            kind: 'struct',
            fields: [
                ['voter', [32]], // PublicKey is stored as 32 bytes
                ['votedNumber', 'u8'], // 1 byte for u8
                ['isVoted', 'u8'], // 1 byte for boolean (stored as u8 in IDL)
                ['bump', 'u8'], // 1 byte for u8
            ]
        }]
    ]);
}

// TypeScript interface matching the IDL structure of VoteAccount
interface VoteAccount {
    voter: PublicKey;
    votedNumber: number;
    isVoted: boolean;
    bump: number;
}

async function voteAccounts() {
    const idlPath = path.resolve(__dirname, "../target/idl/jogo_vote.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), { commitment: "confirmed" });
    const program = new anchor.Program(idl, voteProgramId, provider);
    const voteAccounts = await program.account.voteAccount.all() as anchor.ProgramAccount<VoteAccount>[];
    console.log("VoteAccounts: ", voteAccounts.length);
    voteAccounts.map((voteAccount) => {
        const { voter, votedNumber, isVoted, bump } = voteAccount.account;

        console.log({
            voter: new PublicKey(voter).toBase58(),
            votedNumber,
            isVoted,
            bump
        });
    })
}

voteAccounts()