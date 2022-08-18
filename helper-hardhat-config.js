const networkConfig = {
  31337: {
    name: "localhost",
    uniswapSwapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    uniswapFactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    usdc: "0x5FfbaC75EFc9547FBc822166feD19B05Cd5890bb",
    aaveLPAddrProvider: "0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D"
  },
  5: {
    name: "goerli",
    uniswapSwapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    uniswapFactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    usdc: "0x5FfbaC75EFc9547FBc822166feD19B05Cd5890bb",
    aaveLPAddrProvider: "0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D"
  }
}

const INITIAL_SUPPLY = "1000000000000000000000000"


const developmentChains = ["hardhat", "localhost"]

module.exports = {
  networkConfig,
  developmentChains,
  INITIAL_SUPPLY
}