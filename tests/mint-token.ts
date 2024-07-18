import * as anchor from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  Account,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {assert} from "chai";

describe("mintToken", () => {
  // Anchor provider
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const connection = provider.connection;
  // Keypair for the mint and user
  let mint: PublicKey;
  let userTokenAccount: Account;

  it("Mints a new token", async () => {
    // Create a new mint and associated token account for the user
    const mintAuthority = anchor.web3.Keypair.generate();
    const user = anchor.web3.Keypair.generate();

    // Airdrop SOL to user account
    const tx = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    const latestBlockHash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      {
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: tx,
      },
      "confirmed"
    );


    // Create the mint
    mint = await createMint(
      provider.connection,
      user,
      mintAuthority.publicKey,
      null,
      9, // Decimals
    );

    // Get or create associated token account for the user
    userTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      mint,
      user.publicKey
    );

    /// mint to userATA account address, 10 token
    await mintTo(
      connection,
      user,
      mint,
      userTokenAccount.address,
      mintAuthority,
      10_000_000_000
    );

    const tokenAccountInfo = await provider.connection.getTokenAccountBalance(userTokenAccount.address);
    assert.equal(tokenAccountInfo.value.amount, (new anchor.BN(10_000_000_000)).toString());
  });
});
