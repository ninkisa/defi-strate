// imports
const { getNamedAccounts, deployments, network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const UniswapV3Deployer = require('@uniswap/hardhat-v3-deploy/dist/deployer/UniswapV3Deployer.js').UniswapV3Deployer



module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    const accounts = await ethers.getSigners()
    userAccount = accounts[1]
    adminAccount = accounts[1]


    let uniswapSwapRouterAddress
    let wethAddr
    // if (developmentChains.includes(network.name)) {
    //     ; ({ weth9, factory: uniswapFactory, router, positionManager } = await UniswapV3Deployer.deploy(adminAccount))
    //     uniswapSwapRouterAddress = router.address
    //     wethAddr = weth9
    // } else {
    uniswapSwapRouterAddress = networkConfig[chainId]["uniswapSwapRouter"]
    wethAddr = networkConfig[chainId]["weth"]
    // }
    log("----------------------------------------------------")
    log("Deploying Strategy and waiting for confirmations...")
    const defiStrategy = await deploy("Strategy", {
        from: deployer,
        args: [uniswapSwapRouterAddress, wethAddr],
        log: true,
        // we need to wait if on a live network so we can verify properly
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log(`DeFi Strategy deployed at ${defiStrategy.address}`)

}

module.exports.tags = ["all", "strategy"]