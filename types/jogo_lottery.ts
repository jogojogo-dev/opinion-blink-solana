export type JogoLottery = {
  "version": "0.1.0",
  "name": "jogo_lottery",
  "constants": [
    {
      "name": "SEED",
      "type": "string",
      "value": "\"anchor\""
    }
  ],
  "instructions": [
    {
      "name": "initLotteryPool",
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "lotteryPool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "poolId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "maximumNumber",
          "type": "u64"
        },
        {
          "name": "deadline",
          "type": "u64"
        }
      ]
    },
    {
      "name": "prepareDrawLottery",
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "vaultAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lotteryPool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "winningNumber",
          "type": "u64"
        },
        {
          "name": "bonusLotteryPrize",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyLotteryTicket",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "lotteryPool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userLottery",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "voteNumber",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimPrize",
      "accounts": [
        {
          "name": "userLottery",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "lotteryPool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "lotteryPool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "prize",
            "type": "u64"
          },
          {
            "name": "bonusPrize",
            "type": "u64"
          },
          {
            "name": "claimedPrize",
            "type": "u64"
          },
          {
            "name": "maximumNumber",
            "type": "u64"
          },
          {
            "name": "winningNumber",
            "type": "u64"
          },
          {
            "name": "deadline",
            "type": "u64"
          },
          {
            "name": "isInitialized",
            "type": "bool"
          },
          {
            "name": "isDrawn",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "poolId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userLottery",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "lotteryPool",
            "type": "publicKey"
          },
          {
            "name": "balance",
            "type": "u64"
          },
          {
            "name": "voteNumber",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "isClaimed",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "InitLotteryPoolEvent",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "lotteryPool",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "maximumNumber",
          "type": "u64",
          "index": false
        },
        {
          "name": "deadline",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "EnterLotteryPoolEvent",
      "fields": [
        {
          "name": "poolId",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": true
        },
        {
          "name": "lotteryPool",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "user",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "voteNumber",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "DrawLotteryPoolEvent",
      "fields": [
        {
          "name": "poolId",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": true
        },
        {
          "name": "lotteryPool",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "winningNumber",
          "type": "u64",
          "index": true
        }
      ]
    },
    {
      "name": "ClaimPrizeEvent",
      "fields": [
        {
          "name": "poolId",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": true
        },
        {
          "name": "lotteryPool",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "user",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "prize",
          "type": "u64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "LotteryAlreadyInitialized",
      "msg": "Lottery already initialized"
    },
    {
      "code": 6001,
      "name": "LotteryPoolAlreadyInitialized",
      "msg": "LotteryPool already initialized"
    },
    {
      "code": 6002,
      "name": "LotteryPoolEnded",
      "msg": "LotteryPool end"
    },
    {
      "code": 6003,
      "name": "AlreadyDrawnPool",
      "msg": "Already drawn pool"
    },
    {
      "code": 6004,
      "name": "PoolNotClosed",
      "msg": "LotteryPool not closed"
    },
    {
      "code": 6005,
      "name": "AlreadyClaimed",
      "msg": "User already claimed"
    },
    {
      "code": 6006,
      "name": "NoPrize",
      "msg": "Prize is zero"
    },
    {
      "code": 6007,
      "name": "InsufficientPrize",
      "msg": "Prize is insufficient"
    },
    {
      "code": 6008,
      "name": "InvalidAdminRole",
      "msg": "Invalid admin role"
    },
    {
      "code": 6009,
      "name": "InvalidDeadline",
      "msg": "Invalid deadline"
    },
    {
      "code": 6010,
      "name": "InvalidVoteNumber",
      "msg": "Invalid vote number"
    },
    {
      "code": 6011,
      "name": "InvalidPoolId",
      "msg": "Invalid pool id"
    },
    {
      "code": 6012,
      "name": "InvalidUser",
      "msg": "Invalid user"
    },
    {
      "code": 6013,
      "name": "InvalidTimestamp",
      "msg": "Invalid timestamp"
    },
    {
      "code": 6014,
      "name": "InvalidWinningNumber",
      "msg": "Invalid winning number"
    }
  ]
};

export const IDL: JogoLottery = {
  "version": "0.1.0",
  "name": "jogo_lottery",
  "constants": [
    {
      "name": "SEED",
      "type": "string",
      "value": "\"anchor\""
    }
  ],
  "instructions": [
    {
      "name": "initLotteryPool",
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "lotteryPool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "poolId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "maximumNumber",
          "type": "u64"
        },
        {
          "name": "deadline",
          "type": "u64"
        }
      ]
    },
    {
      "name": "prepareDrawLottery",
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "vaultAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lotteryPool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "winningNumber",
          "type": "u64"
        },
        {
          "name": "bonusLotteryPrize",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyLotteryTicket",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "lotteryPool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userLottery",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "voteNumber",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimPrize",
      "accounts": [
        {
          "name": "userLottery",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "lotteryPool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "lotteryPool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "prize",
            "type": "u64"
          },
          {
            "name": "bonusPrize",
            "type": "u64"
          },
          {
            "name": "claimedPrize",
            "type": "u64"
          },
          {
            "name": "maximumNumber",
            "type": "u64"
          },
          {
            "name": "winningNumber",
            "type": "u64"
          },
          {
            "name": "deadline",
            "type": "u64"
          },
          {
            "name": "isInitialized",
            "type": "bool"
          },
          {
            "name": "isDrawn",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "poolId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userLottery",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "lotteryPool",
            "type": "publicKey"
          },
          {
            "name": "balance",
            "type": "u64"
          },
          {
            "name": "voteNumber",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "isClaimed",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "InitLotteryPoolEvent",
      "fields": [
        {
          "name": "admin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "lotteryPool",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "maximumNumber",
          "type": "u64",
          "index": false
        },
        {
          "name": "deadline",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "EnterLotteryPoolEvent",
      "fields": [
        {
          "name": "poolId",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": true
        },
        {
          "name": "lotteryPool",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "user",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "voteNumber",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "DrawLotteryPoolEvent",
      "fields": [
        {
          "name": "poolId",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": true
        },
        {
          "name": "lotteryPool",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "winningNumber",
          "type": "u64",
          "index": true
        }
      ]
    },
    {
      "name": "ClaimPrizeEvent",
      "fields": [
        {
          "name": "poolId",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": true
        },
        {
          "name": "lotteryPool",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "user",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "prize",
          "type": "u64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "LotteryAlreadyInitialized",
      "msg": "Lottery already initialized"
    },
    {
      "code": 6001,
      "name": "LotteryPoolAlreadyInitialized",
      "msg": "LotteryPool already initialized"
    },
    {
      "code": 6002,
      "name": "LotteryPoolEnded",
      "msg": "LotteryPool end"
    },
    {
      "code": 6003,
      "name": "AlreadyDrawnPool",
      "msg": "Already drawn pool"
    },
    {
      "code": 6004,
      "name": "PoolNotClosed",
      "msg": "LotteryPool not closed"
    },
    {
      "code": 6005,
      "name": "AlreadyClaimed",
      "msg": "User already claimed"
    },
    {
      "code": 6006,
      "name": "NoPrize",
      "msg": "Prize is zero"
    },
    {
      "code": 6007,
      "name": "InsufficientPrize",
      "msg": "Prize is insufficient"
    },
    {
      "code": 6008,
      "name": "InvalidAdminRole",
      "msg": "Invalid admin role"
    },
    {
      "code": 6009,
      "name": "InvalidDeadline",
      "msg": "Invalid deadline"
    },
    {
      "code": 6010,
      "name": "InvalidVoteNumber",
      "msg": "Invalid vote number"
    },
    {
      "code": 6011,
      "name": "InvalidPoolId",
      "msg": "Invalid pool id"
    },
    {
      "code": 6012,
      "name": "InvalidUser",
      "msg": "Invalid user"
    },
    {
      "code": 6013,
      "name": "InvalidTimestamp",
      "msg": "Invalid timestamp"
    },
    {
      "code": 6014,
      "name": "InvalidWinningNumber",
      "msg": "Invalid winning number"
    }
  ]
};
