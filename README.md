# Gas Estimation tool

This tool allows you to estimate required gas to process transaction on Flow Testnet using transaction id.

## Usage
### By Cloning the repo
- Clone the repo
- `npm install`
- `npm run example` or `node index {txId}`

### Via npx
- npx flow-get {txId}

#### Options
- *-n* or *--network* - specify network `[mainnet, testnet]`
- *-t* or *--timeout* - timeout for transaction fetching (in ms). Default `3000ms`
- *-h* - usage help

## Tools Used
- FCL JS - https://github.com/onflow/fcl-js