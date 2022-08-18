/** @type import('hardhat/config').HardhatUserConfig */
require("@uniswap/hardhat-v3-deploy");
require("@nomiclabs/hardhat-waffle")
require('dotenv').config();
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy")


const { API_URL, PRIVATE_KEY } = process.env;


module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.8",
      },
      {
        version: "0.8.10",
      },
      {
        version: "0.6.12",
      },
      {
        version: "0.4.19",
      },
      {
        version: "0.7.6",
      }
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        // url: "https://eth-mainnet.g.alchemy.com/v2/Pa8FgCymR5IuyZxQTUyQUItSHA3s_YhF",
        // blockNumber: 14390000
        url: "https://eth-goerli.g.alchemy.com/v2/mwCSzJiWlR2gaqbRCvdOIKkcG4PcI1YG",
        //   // blockNumber: 7413967
      },
      // blockConfirmations: 10,

    },
    goerli: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      chainId: 5,
      blockConfirmations: 6,
    },
    localhost: {
      url: "http://localhost:8545",
      chainId: 31337,
      gasLimit: 3e5,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
    },
  },
};
