# JoGo Lottery Solana

## Build
```shell
anchor keys sync
anchor build -p=jogo_lottery
```

### Deploy by Solana CLI
```shell
solana program deploy \
    -k=.keypairs/deployer.json \
    -u=mainnet-beta \
    --with-compute-unit-price=<0.00005> \
    --buffer=<YOUR_BUFFER_ACCOUNT> \
    --use-quic \
    --commitment=processed \
    --program-id=target/deploy/jogo_lottery-keypair.json \
    target/deploy/jogo_lottery.so
```

### Deploy by Anchor
```shell
anchor deploy --program-name=<PROGRAM_NAME> --program-keypair=<KEYPAIR>
```

## Upgrade
```shell
anchor upgrade -p <PROGRAM_ID> target/deploy/jogo_lottery.so
```

## Note
```json
{
  "version": "0.1.0",
  "name": "jogo_program",
  "metadata": {
    "address": "<PROGRAM_ID>"
  }
}
```

## SPL

### Create new SPL token
```shell
spl-token create-token --decimals=6 -u=https://devnet.sonic.game --fee-payer=.keypairs/deployer.json --mint-authority=<MINT_AUTHORITY>
```

### Create token account
```shell
spl-token create-account --fee-payer=.keypairs/deployer.json -u=https://devnet.sonic.game --owner=<OWNER> <MINT_ACCOUNT>
```

### Mint to
```shell
spl-token mint -u=https://devnet.sonic.game --fee-payer=.keypairs/deployer.json --mint-authority=.keypairs/deployer.json --recipient-owner=<RECIPIENT_OWNER> <MINT_ACCOUNT> <AMOUNT>
```

## Deployment

### Sonic-Game

```jogo_lottery```: EYWcQwe2jEpGfDqdFKT9PNPdKSqYrPSfgCSLpDxjDGxf
