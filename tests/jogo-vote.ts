import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JogoVote } from "../target/types/jogo_vote";

describe("jogo-vote", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.JogoVote as Program<JogoVote>;
  const payer = anchor.web3.Keypair.generate();
  const maxVoteNumbers = 10;
  const [stateAccountKey, stateAccountBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("state"), payer.publicKey.toBuffer()],
      program.programId
    );

  before(async () => {
    const tx = await program.provider.connection.requestAirdrop(
      payer.publicKey,
      10000000000
    );
    const latestBlockHash =
      await program.provider.connection.getLatestBlockhash();
    await program.provider.connection.confirmTransaction(
      {
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: tx,
      },
      "confirmed"
    );
  });

  it("Initialize state", async () => {
    const tx = await program.methods
      .initialize(maxVoteNumbers)
      .accounts({
        state: stateAccountKey,
        admin: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer])
      .rpc();
    console.log("Initialize transaction signature", tx);
  });

  it("Multiple vote", async () => {
    for (let i = 0; i < 10; i++) {
      const voter = anchor.web3.Keypair.generate();
      const randomVoteNumber = Math.floor(Math.random() * 10) + 1;
      const [voteAccountPDA, bump] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("vote_account"), voter.publicKey.toBuffer()],
          program.programId
        );
      const tx = await program.methods
        .vote(randomVoteNumber)
        .accounts({
          state: stateAccountKey,
          payer: payer.publicKey,
          voter: voter.publicKey,
          voteAccount: voteAccountPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([payer, voter])
        .rpc();
      // console.log("Vote transaction signature", tx);
      // const voteAccountData = await program.account.voteAccount.fetch(voteAccountPDA);
      // console.log("VoteAccount Data: ", voteAccountData);
    }
    // const voteAccounts = await program.account.voteAccount.all();
    // console.log("VoteAccounts: ", voteAccounts.length);
    // voteAccounts.map((voteAccount) => {
    //   console.log(voteAccount.account.voter.toBase58(), voteAccount.account.votedNumber);
    // })
    // const stateAccount = await program.account.joGoVoteState.fetch(stateAccountKey);
    // console.log("StateAccount: ", stateAccount);
  });
});
