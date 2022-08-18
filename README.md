# DeFi Strategy Contract
This repository contains the smart contracts for the DeFi Strategy project.  

To download dependencies:
```
npm install
```

To run unit tests:
```
npx hardhat test
```

To start localnode:
```
npx hardhat node
```
This will automatically deploy the Strategy contract


To interact with the contract on localnetwork: 
(now working at the moment as Uniswap is not configured correctly)
```
npx hardhat run scripts/deposit.js --network localhost
```

To deploy the contract on Goerli test network: 
```
npx hardhat deploy --network goerli
```

To interact with the contract on localnetwork: 
```
npx hardhat run scripts/deposit.js --network goerli
```