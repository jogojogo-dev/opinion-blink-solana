// import * as anchor from "@coral-xyz/anchor";
// import {Program} from "@coral-xyz/anchor";
// import {JogoLottery} from "../target/types/jogo_lottery";
//
// describe("jogo-lottery", () => {
//     anchor.setProvider(anchor.AnchorProvider.env());
//     const program = anchor.workspace.JogoLottery as Program<JogoLottery>;
//     const admin = anchor.web3.Keypair.generate();
//     const users = Array.from({length: 20}, () =>
//         anchor.web3.Keypair.generate()
//     );
//     const encoder = new TextEncoder();
//     const poolId = Array.from(encoder.encode("euro2024".padEnd(32, "\0")));
//     const [lotteryPoolPDA, lotteryPoolBump] =
//         anchor.web3.PublicKey.findProgramAddressSync(
//             [
//                 Buffer.from("lottery_pool"),
//                 admin.publicKey.toBuffer(),
//                 Buffer.from(poolId),
//             ],
//             program.programId
//         );
//     let randomWinningNumber = 0;
//     const [lotteryPoolVaultPDA, lotteryPoolVaultBump] =
//         anchor.web3.PublicKey.findProgramAddressSync(
//             [
//                 Buffer.from("lottery_pool_sol"),
//                 admin.publicKey.toBuffer(),
//                 lotteryPoolPDA.toBuffer(),
//             ],
//             program.programId
//         );
//
//     before(async () => {
//         const tx = await program.provider.connection.requestAirdrop(
//             admin.publicKey,
//             1000_000_000_000
//         );
//         const latestBlockHash =
//             await program.provider.connection.getLatestBlockhash();
//         await program.provider.connection.confirmTransaction(
//             {
//                 blockhash: latestBlockHash.blockhash,
//                 lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
//                 signature: tx,
//             },
//             "confirmed"
//         );
//         for (let i = 0; i < users.length; i++) {
//             const tx = await program.provider.connection.requestAirdrop(
//                 users[i].publicKey,
//                 10_000_000_000
//             );
//             const latestBlockHash =
//                 await program.provider.connection.getLatestBlockhash();
//             await program.provider.connection.confirmTransaction(
//                 {
//                     blockhash: latestBlockHash.blockhash,
//                     lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
//                     signature: tx,
//                 },
//                 "confirmed"
//             );
//         }
//     });
//
//     it("Initialize LotteryPool", async () => {
//         const tx = await program.methods
//             .initLotteryPool(
//                 poolId,
//                 new anchor.BN(4),
//                 new anchor.BN(100_000_000),
//                 new anchor.BN(300),
//             )
//             .accounts({
//                 admin: admin.publicKey,
//                 vaultAccount: lotteryPoolVaultPDA,
//                 lotteryPool: lotteryPoolPDA,
//                 vaultTokenAccount: anchor.web3.Keypair.generate().publicKey,
//                 mintAccount: anchor.web3.Keypair.generate().publicKey,
//                 systemProgram: anchor.web3.SystemProgram.programId,
//             })
//             .signers([admin])
//             .rpc();
//         console.log("Initialize transaction signature", tx);
//     });
//
//     // it("Multiple buy lottery", async () => {
//     //   for (let i = 0; i < 20; i++) {
//     //     const randomVoteNumber = Math.floor(Math.random() * 4) + 1;
//     //     if (Math.floor(Math.random()) % 2 == 0) {
//     //       randomWinningNumber = randomVoteNumber;
//     //     }
//     //     if (randomWinningNumber == 0 && i == 9) {
//     //       randomWinningNumber = randomVoteNumber;
//     //     }
//     //     const [userLotteryPDA, userLotteryBump] =
//     //       anchor.web3.PublicKey.findProgramAddressSync(
//     //         [
//     //           Buffer.from("user_lottery"),
//     //           lotteryPoolPDA.toBuffer(),
//     //           users[i].publicKey.toBuffer(),
//     //           Buffer.from([randomVoteNumber]),
//     //         ],
//     //         program.programId
//     //       );
//     //     const tx = await program.methods
//     //       .buyLotteryTicket(new anchor.BN(randomVoteNumber), new anchor.BN(1))
//     //       .accounts({
//     //         user: users[i].publicKey,
//     //         vaultAccount: lotteryPoolVaultPDA,
//     //         lotteryPool: lotteryPoolPDA,
//     //         userLottery: userLotteryPDA,
//     //         systemProgram: anchor.web3.SystemProgram.programId,
//     //       })
//     //       .signers([users[i]])
//     //       .rpc();
//     //     // console.log("BuyLotteryTicket transaction signature", tx);
//     //     // const userLotteryData = await program.account.userLottery.fetch(userLotteryPDA);
//     //     // console.log("UserLottery Data: ", userLotteryData);
//     //   }
//     //   const lotteryPool = await program.account.lotteryPool.fetch(lotteryPoolPDA);
//     //   assert.equal(
//     //     lotteryPool.prize.toNumber(),
//     //     2_000_000_000,
//     //     "Total prize should be 2_000_000_000"
//     //   );
//     // });
//     //
//     // it("Draw lottery pool", async () => {
//     //   let recipient = anchor.web3.Keypair.generate();
//     //   let recipientBalanceBefore = await program.provider.connection.getBalance(
//     //     recipient.publicKey
//     //   );
//     //   assert.equal(recipientBalanceBefore, 0, "Recipient balance should be zero");
//     //   let lotteryPool = await program.account.lotteryPool.fetch(lotteryPoolPDA);
//     //   assert.equal(
//     //     lotteryPool.isDrawn,
//     //     false,
//     //     "Lottery pool should not be drawn"
//     //   );
//     //   assert.equal(randomWinningNumber != 0, true, "Can not be zero");
//     //   const tx = await program.methods
//     //     .prepareDrawLottery(
//     //       new anchor.BN(randomWinningNumber),
//     //       new anchor.BN(500_000_000_000)
//     //     )
//     //     .accounts({
//     //       admin: admin.publicKey,
//     //       vaultAccount: lotteryPoolVaultPDA,
//     //       recipient: recipient.publicKey,
//     //       lotteryPool: lotteryPoolPDA,
//     //       systemProgram: anchor.web3.SystemProgram.programId,
//     //     })
//     //     .signers([admin])
//     //     .rpc();
//     //   console.log("Draw lottery transaction signature", tx);
//     //   lotteryPool = await program.account.lotteryPool.fetch(lotteryPoolPDA);
//     //   let recipientBalanceAfter = await program.provider.connection.getBalance(
//     //     recipient.publicKey
//     //   );
//     //   let fee = new anchor.BN(500_000_000_000)
//     //     .add(new anchor.BN(2_000_000_000))
//     //     .mul(new anchor.BN(300))
//     //     .div(new anchor.BN(1000));
//     //   assert.equal(
//     //     recipientBalanceAfter,
//     //     fee.toNumber(),
//     //     `Recipient balance should be ${fee.toNumber()}`
//     //   );
//     //   assert.equal(lotteryPool.isDrawn, true, "Lottery pool should be drawn");
//     //   assert.equal(
//     //     lotteryPool.winningNumber.toNumber(),
//     //     randomWinningNumber,
//     //     `Winning number should be ${randomWinningNumber}`
//     //   );
//     // });
//     //
//     // it("Claim prize", async () => {
//     //   let vaultBalanceBefore = await program.provider.connection.getBalance(
//     //     lotteryPoolVaultPDA
//     //   );
//     //   let lotteryPoolData = await program.account.lotteryPool.fetch(
//     //     lotteryPoolPDA
//     //   );
//     //   let prize = lotteryPoolData.prize;
//     //   let bonusPrize = lotteryPoolData.bonusPrize;
//     //   let votesPrize = lotteryPoolData.votesPrize;
//     //   for (let i = 0; i < 20; i++) {
//     //     let userLotteryKey: anchor.web3.PublicKey;
//     //     try {
//     //       const [userLotteryPDA, userLotteryBump] =
//     //         anchor.web3.PublicKey.findProgramAddressSync(
//     //           [
//     //             Buffer.from("user_lottery"),
//     //             lotteryPoolPDA.toBuffer(),
//     //             users[i].publicKey.toBuffer(),
//     //             Buffer.from([randomWinningNumber]),
//     //           ],
//     //           program.programId
//     //         );
//     //       const userLotteryData = await program.account.userLottery.fetch(
//     //         userLotteryPDA
//     //       );
//     //       if (userLotteryData.balance.toNumber() == 0) continue;
//     //       userLotteryKey = userLotteryPDA;
//     //     } catch (e) {
//     //       continue;
//     //     }
//     //     const tx = await program.methods
//     //       .claimPrize()
//     //       .accounts({
//     //         owner: users[i].publicKey,
//     //         lotteryPool: lotteryPoolPDA,
//     //         vaultAccount: lotteryPoolVaultPDA,
//     //         userLottery: userLotteryKey,
//     //         systemProgram: anchor.web3.SystemProgram.programId,
//     //       })
//     //       .signers([users[i]])
//     //       .rpc();
//     //     console.log("Claim prize transaction signature", tx);
//     //     const userLotteryData = await program.account.userLottery.fetch(
//     //       userLotteryKey
//     //     );
//     //     let claimedReward = userLotteryData.balance
//     //       .mul(prize.add(bonusPrize))
//     //       .div(votesPrize[randomWinningNumber])
//     //       .mul(new anchor.BN(700))
//     //       .div(new anchor.BN(1000));
//     //     assert.isAtMost(
//     //       userLotteryData.claimedPrize
//     //         .mul(new anchor.BN(700))
//     //         .div(new anchor.BN(1000))
//     //         .toNumber(),
//     //       claimedReward.toNumber(),
//     //       "Claim reward should be equal to balance"
//     //     );
//     //   }
//     //   let vaultBalanceAfter = await program.provider.connection.getBalance(
//     //     lotteryPoolVaultPDA
//     //   );
//     //   assert.isBelow(
//     //     vaultBalanceAfter,
//     //     vaultBalanceBefore,
//     //     "Balance after should be below balance before"
//     //   );
//     // });
//     //
//     // it("Check all user status", async () => {
//     //   for (let i = 0; i < 20; i++) {
//     //     try {
//     //       const [userLotteryPDA, userLotteryBump] =
//     //         anchor.web3.PublicKey.findProgramAddressSync(
//     //           [
//     //             Buffer.from("user_lottery"),
//     //             lotteryPoolPDA.toBuffer(),
//     //             users[i].publicKey.toBuffer(),
//     //             Buffer.from([randomWinningNumber]),
//     //           ],
//     //           program.programId
//     //         );
//     //       const userLotteryData = await program.account.userLottery.fetch(
//     //         userLotteryPDA
//     //       );
//     //       console.log({
//     //         owner: userLotteryData.owner.toBase58(),
//     //         balance: userLotteryData.balance.toNumber(),
//     //         claimedPrize: userLotteryData.claimedPrize.toNumber(),
//     //       });
//     //     } catch (e) {}
//     //   }
//     // });
//     //
//     // it("Check lotteryPool votesPrize", async() => {
//     //   let lotteryPoolData = await program.account.lotteryPool.fetch(lotteryPoolPDA);
//     //   console.log("VotesPrize: ", lotteryPoolData.votesPrize);
//     // })
//     //
//     // it("Close LotteryPool Vault", async () => {
//     //   let vaultBalanceBefore = await program.provider.connection.getBalance(
//     //     lotteryPoolVaultPDA
//     //   );
//     //   let adminBalanceBefore = await program.provider.connection.getBalance(
//     //     admin.publicKey
//     //   );
//     //   const tx = await program.methods
//     //     .closeLotteryPool()
//     //     .accounts({
//     //       admin: admin.publicKey,
//     //       vaultAccount: lotteryPoolVaultPDA,
//     //       lotteryPool: lotteryPoolPDA,
//     //       systemProgram: anchor.web3.SystemProgram.programId,
//     //     })
//     //     .signers([admin])
//     //     .rpc();
//     //   console.log("Close lottery transaction signature", tx);
//     //   let adminBalanceAfter = await program.provider.connection.getBalance(
//     //     admin.publicKey
//     //   );
//     //   console.log("Admin balance after", adminBalanceAfter);
//     //   console.log("Admin balance before", adminBalanceBefore);
//     //   console.log("Admin balance diff", adminBalanceAfter - adminBalanceBefore);
//     //   console.log("Vault balance before", vaultBalanceBefore);
//     //   assert.isAtMost(
//     //     adminBalanceAfter,
//     //     adminBalanceBefore + vaultBalanceBefore,
//     //     "Admin balance after should be above balance before + vault balance before"
//     //   );
//     // });
// });
