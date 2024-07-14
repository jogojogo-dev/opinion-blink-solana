export type JogoVote = {
  "version": "0.1.0",
  "name": "jogo_vote",
  "constants": [
    {
      "name": "SEED",
      "type": "string",
      "value": "\"anchor\""
    }
  ],
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "maxVoteNumbers",
          "type": "u8"
        }
      ]
    },
    {
      "name": "vote",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "voter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "voteAccount",
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
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "joGoVoteState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "maxVoteNumbers",
            "type": "u8"
          },
          {
            "name": "totalVoterNumbers",
            "type": "u64"
          },
          {
            "name": "eachVoteNumbers",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          }
        ]
      }
    },
    {
      "name": "voteAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voter",
            "type": "publicKey"
          },
          {
            "name": "votedNumber",
            "type": "u8"
          },
          {
            "name": "isVoted",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "AlreadyVoted",
      "msg": "User already vote"
    },
    {
      "code": 6001,
      "name": "InvalidVoteNumber",
      "msg": "Invalid vote number"
    }
  ]
};

export const IDL: JogoVote = {
  "version": "0.1.0",
  "name": "jogo_vote",
  "constants": [
    {
      "name": "SEED",
      "type": "string",
      "value": "\"anchor\""
    }
  ],
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "maxVoteNumbers",
          "type": "u8"
        }
      ]
    },
    {
      "name": "vote",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "voter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "voteAccount",
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
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "joGoVoteState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "maxVoteNumbers",
            "type": "u8"
          },
          {
            "name": "totalVoterNumbers",
            "type": "u64"
          },
          {
            "name": "eachVoteNumbers",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          }
        ]
      }
    },
    {
      "name": "voteAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voter",
            "type": "publicKey"
          },
          {
            "name": "votedNumber",
            "type": "u8"
          },
          {
            "name": "isVoted",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "AlreadyVoted",
      "msg": "User already vote"
    },
    {
      "code": 6001,
      "name": "InvalidVoteNumber",
      "msg": "Invalid vote number"
    }
  ]
};
