const networkConfig = {
  31337: {
    name: "localhost",
    uniswapSwapRouter: "0xAd578511086c7b454DAf1f8BFbDCE6ca12dE2497",
    uniswapFactory: "0xAf49e224e71AF966D5367E6c8DED0CF7FcD110d0",
    weth: '0x9D76393e381FE089950c5bFbDD603f033BfB08c2',
    usdc: ""
  },
  5: {
    name: "goerli",
    uniswapSwapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    uniswapFactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    usdc: "0x5FfbaC75EFc9547FBc822166feD19B05Cd5890bb"
  }
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
  networkConfig,
  developmentChains,
}