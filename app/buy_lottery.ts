import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction
} from '@solana/web3.js';
import BN from "bn.js"
import {sha256} from "crypto-hash";
import path from "node:path";
import fs from "node:fs";
import * as anchor from "@coral-xyz/anchor";
import {IDL, JogoLottery} from '../types/jogo_lottery'

const connection = new Connection("https://devnet.sonic.game")
const payerSecretKeyString = process.env.PAYER_SECRET_KEY;
if (!payerSecretKeyString) {
    throw new Error("PAYER_SECRET_KEY not found in .env file");
}
const payerSecretKey = new Uint8Array(JSON.parse(payerSecretKeyString));
const payer = Keypair.fromSecretKey(payerSecretKey);
export type Network = 'solana-mainnet' | 'solana-devnet' | 'sonic-devnet' | 'localnet'

const programIds: Record<Network, string> = {
    'solana-mainnet': '',
    'solana-devnet': '',
    'sonic-devnet': 'Yz73Shmf9b3YsqDzuqGhqBoqttU1njciYQryGgLPi6F',
    'localnet': 'CTMfMAsohXbSQa5TFTqFPpQdoQ88dUv77saWE1zXcrMq'
}

const lotteryPoolAccounts: Record<Network, string> = {
    'solana-mainnet': '',
    'solana-devnet': '',
    'sonic-devnet': 'FijjaVJbTACD8qwZiBFRs4UprDitdp4E6f4GmWUcPPr2',
    'localnet': '56BDen4Kuay3n8ECSgsNz6sCYbPj9U4rQ6pSDo2sPHhF'
}

const lotteryPoolVaultAccounts: Record<Network, string> = {
    'solana-mainnet': '',
    'solana-devnet': '',
    'sonic-devnet': '7frFP38CxTz1J8bRp6NbWwYwKGn8ZqfuJ5Mr8Xrymyoh',
    'localnet': 'Aks1SEHsE6Jzw213X9ENdtjN53Ey2fNYcySSmjq2odbK'
}

async function getDiscriminator(name: string): Promise<Buffer> {
    const discriminator = await sha256(`global:${name}`)
    return Buffer.from(discriminator.slice(0, 16), 'hex')
}

async function buyLotteryTransaction(voter: PublicKey, voteNumber: number, network: Network) {
    const programId = new PublicKey(programIds[network])
    const lotteryPoolAccount = new PublicKey(lotteryPoolAccounts[network])
    const lotteryPoolVaultAccount = new PublicKey(lotteryPoolVaultAccounts[network])
    if (!programId || !lotteryPoolAccount) {
        throw new Error('Invalid network')
    }
    const recentBlockhash = await connection.getLatestBlockhash({commitment: 'max'})
    const [userLotteryPDA, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_lottery'), lotteryPoolAccount.toBuffer(), voter.toBuffer(), Buffer.from([voteNumber])],
        programId
    )
    const discriminator = await getDiscriminator('buy_lottery_ticket')
    const data = Buffer.concat([discriminator, Buffer.from(new Uint8Array(new BN(voteNumber).toArray('le', 8)))])
    const instruction = new TransactionInstruction({
        keys: [
            {pubkey: voter, isSigner: true, isWritable: true},
            {pubkey: lotteryPoolAccount, isSigner: false, isWritable: true},
            {pubkey: lotteryPoolVaultAccount, isSigner: false, isWritable: true},
            {pubkey: userLotteryPDA, isSigner: false, isWritable: true},
            {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
        ],
        programId: programId,
        data: data,
    })
    const messageV0 = new TransactionMessage({
        payerKey: voter,
        recentBlockhash: recentBlockhash.blockhash,
        instructions: [instruction],
    }).compileToV0Message()
    return new VersionedTransaction(messageV0)
}

async function buyLottery() {
    const payerSecretKeyString = process.env.PAYER_SECRET_KEY;
    if (!payerSecretKeyString) {
        throw new Error("PAYER_SECRET_KEY not found in .env file");
    }
    const payerSecretKey = new Uint8Array(JSON.parse(payerSecretKeyString));
    const payer = Keypair.fromSecretKey(payerSecretKey);
    console.log(payer.publicKey.toBase58())

    const voteNumber = 2;
    const tx = await buyLotteryTransaction(payer.publicKey, voteNumber, 'localnet');
    tx.sign([payer])
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

interface UserLottery {
    owner: PublicKey,
    lotteryPool: PublicKey,
    balance: BigInt,
    voteNumber: number,
    bump: number,
    isClaimed: boolean
}

async function getUserLotteries(network: Network) {
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {commitment: "confirmed"});
    const programId = new PublicKey(programIds[network]);

    const program = new anchor.Program<JogoLottery>(IDL, programId, provider);
    const userLotteryAccounts = await program.account.userLottery.all()
    console.log("UserLotteryAccounts: ", userLotteryAccounts.length);
    userLotteryAccounts.map((userLottery) => {
        const {owner, lotteryPool, balance, voteNumber, bump, isClaimed} = userLottery.account;

        console.log({
            owner: owner.toBase58(),
            lotteryPool: lotteryPool.toBase58(),
            balance: balance.toString(),
            voteNumber: voteNumber.toString(),
            bump,
            isClaimed
        });
    })
    return userLotteryAccounts
}

async function getTotalUserAtVoteNumber(network: Network, voteNumber: number) {
    const userLotteries = await getUserLotteries(network);
    return userLotteries.filter((userLottery) => userLottery.account.voteNumber.toNumber() === voteNumber).length
}

async function checkUserHasVoteNumber(network: Network, userPubKey: PublicKey, voteNumber: number) {
    const lotteryPool = new PublicKey(lotteryPoolAccounts[network]);
    const programId = new PublicKey(programIds[network]);
    const idlPath = path.resolve(__dirname, "../target/idl/jogo_lottery.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {commitment: "confirmed"});

    const program = new anchor.Program(idl, programId, provider);
    try {
        const [userLotteryPDA, userLotteryBump] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("user_lottery"),
                lotteryPool.toBuffer(),
                userPubKey.toBuffer(),
                Buffer.from([voteNumber])
            ],
            programId
        );
        await program.account.userLottery.fetch(userLotteryPDA);
    } catch (e) {
        return false;
    }
    return true;
}

getUserLotteries("sonic-devnet")
