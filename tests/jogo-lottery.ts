import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JogoLottery } from "../target/types/jogo_lottery";
import {assert} from "chai";

describe("jogo-lottery", () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.JogoLottery as Program<JogoLottery>;
    const admin = anchor.web3.Keypair.generate();
    const users = Array.from({length: 10}, () => anchor.web3.Keypair.generate());
    const encoder = new TextEncoder();
    const poolId = Array.from(encoder.encode("uec2024".padEnd(32, '\0')));
    const deadline = Date.now() + 1000;
    const [lotteryPoolPDA, lotteryPoolBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("lottery_pool"),
            admin.publicKey.toBuffer(),
            Buffer.from(poolId)
        ],
        program.programId
    )
    let randomWinningNumber = 0;
    const [lotteryPoolVaultPDA, lotteryPoolVaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("lottery_pool_sol"),
            admin.publicKey.toBuffer(),
            lotteryPoolPDA.toBuffer(),
        ],
        program.programId
    )

    before(async() => {
        const tx = await program.provider.connection.requestAirdrop(admin.publicKey, 1000_000_000_000);
        const latestBlockHash = await program.provider.connection.getLatestBlockhash();
        await program.provider.connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: tx,
        }, 'confirmed');
        for (let i = 0; i < users.length; i++) {
            const tx = await program.provider.connection.requestAirdrop(users[i].publicKey, 10_000_000_000);
            const latestBlockHash = await program.provider.connection.getLatestBlockhash();
            await program.provider.connection.confirmTransaction({
                blockhash: latestBlockHash.blockhash,
                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                signature: tx,
            }, 'confirmed');
        }
    })

    it("Initialize LotteryPool", async () => {
        const tx = await program.methods.initLotteryPool(poolId, new anchor.BN(4), new anchor.BN(deadline)).accounts({
            admin: admin.publicKey,
            vaultAccount: lotteryPoolVaultPDA,
            lotteryPool:lotteryPoolPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).signers([admin]).rpc();
        console.log("Initialize transaction signature", tx);
    });

    it("Multiple vote", async () => {
        for (let i = 0; i < 10; i++) {
            const randomVoteNumber =Math.floor(Math.random() * 4) + 1
            if (Math.floor(Math.random()) % 2 == 0) {
                randomWinningNumber = randomVoteNumber;
            }
            if (randomWinningNumber == 0 && i == 9) {
                randomWinningNumber = randomVoteNumber;
            }
            const [userLotteryPDA, userLotteryBump] = anchor.web3.PublicKey.findProgramAddressSync(
                [
                    Buffer.from("user_lottery"),
                    lotteryPoolPDA.toBuffer(),
                    users[i].publicKey.toBuffer(),
                    Buffer.from([randomVoteNumber])
                ],
                program.programId
            );
            const tx = await program.methods.buyLotteryTicket(new anchor.BN(randomVoteNumber)).accounts({
                user: users[i].publicKey,
                vaultAccount: lotteryPoolVaultPDA,
                lotteryPool: lotteryPoolPDA,
                userLottery: userLotteryPDA,
                systemProgram: anchor.web3.SystemProgram.programId,
            }).signers([users[i]]).rpc();
            // console.log("BuyLotteryTicket transaction signature", tx);
            // const userLotteryData = await program.account.userLottery.fetch(userLotteryPDA);
            // console.log("UserLottery Data: ", userLotteryData);
        }
        const lotteryPool = await program.account.lotteryPool.fetch(lotteryPoolPDA)
        assert.equal(lotteryPool.totalVotes.toNumber(), 10, "Total votes should be 10");
        assert.equal(lotteryPool.prize.toNumber(), 100_000_000, "Total prize should be 100_000_000")
    });

    it("Draw lottery pool", async() => {
        let lotteryPool = await program.account.lotteryPool.fetch(lotteryPoolPDA)
        assert.equal(lotteryPool.isDrawn, false, "Lottery pool should not be drawn");
        assert.equal(randomWinningNumber != 0, true, "Can not be zero");
        const tx = await program.methods.prepareDrawLottery(new anchor.BN(randomWinningNumber)).accounts({
            admin: admin.publicKey,
            vaultAccount: lotteryPoolVaultPDA,
            lotteryPool:lotteryPoolPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).signers([admin]).rpc();
        console.log("Draw lottery transaction signature", tx);
        lotteryPool = await program.account.lotteryPool.fetch(lotteryPoolPDA)
        assert.equal(lotteryPool.isDrawn, true, "Lottery pool should be drawn");
        assert.equal(lotteryPool.winningNumber.toNumber(), randomWinningNumber, `Winning number should be ${randomWinningNumber}`);
    })

    it("Claim prize", async() => {
        let balanceBefore = await program.provider.connection.getBalance(lotteryPoolVaultPDA);
        for (let i = 0; i < 10; i++) {
            let userLotteryKey: anchor.web3.PublicKey;
            try {
                const [userLotteryPDA, userLotteryBump] = anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        Buffer.from("user_lottery"),
                        lotteryPoolPDA.toBuffer(),
                        users[i].publicKey.toBuffer(),
                        Buffer.from([randomWinningNumber])
                    ],
                    program.programId
                );
                const userLotteryData = await program.account.userLottery.fetch(userLotteryPDA);
                if (userLotteryData.balance.toNumber() == 0) continue;
                userLotteryKey = userLotteryPDA
            } catch (e) {
                // console.log(e)
                continue
            }
            const tx = await program.methods.claimPrize().accounts({
                owner:  users[i].publicKey,
                lotteryPool: lotteryPoolPDA,
                vaultAccount: lotteryPoolVaultPDA,
                userLottery: userLotteryKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            }).signers([users[i]]).rpc();
            console.log("Claim prize transaction signature", tx);
        }
        let balanceAfter = await program.provider.connection.getBalance(lotteryPoolVaultPDA);
        assert.isBelow(balanceAfter, balanceBefore, "Balance after should be below balance before");
    })
});
