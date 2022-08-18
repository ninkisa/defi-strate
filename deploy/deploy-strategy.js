// imports
const { getNamedAccounts, deployments, network } = require("hardhat")
const { networkConfig, developmentChains, INITIAL_SUPPLY } = require("../helper-hardhat-config")



module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    const accounts = await ethers.getSigners()
    userAccount = accounts[1]
    adminAccount = accounts[1]


    let uniswapSwapRouterAddress
    let wethAddr
    let usdcAddr
    let aaveLPAddrProviderAddress

    if (developmentChains.includes(network.name)) {
        const usdc = await deploy("TestToken", {
            from: deployer,
            args: ["TestUSDC", "T1", 18],
            log: true,
            waitConfirmations: network.config.blockConfirmations || 1,
        })
        // await (await usdc.mint(deployer.address, INITIAL_SUPPLY)).wait();

        usdcAddr = usdc.address
        log(`testToken deployed at ${usdcAddr}`)

    } else {
        usdcAddr = networkConfig[chainId]["usdc"]
    }
    uniswapSwapRouterAddress = networkConfig[chainId]["uniswapSwapRouter"]
    aaveLPAddrProviderAddress = networkConfig[chainId]["aaveLPAddrProvider"]
    wethAddr = networkConfig[chainId]["weth"]



    log("----------------------------------------------------")
    log("Deploying Strategy and waiting for confirmations...")
    const defiStrategy = await deploy("Strategy", {
        from: deployer,
        args: [uniswapSwapRouterAddress, aaveLPAddrProviderAddress, wethAddr, usdcAddr],
        log: true,
        // we need to wait if on a live network so we can verify properly
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log(`DeFi Strategy deployed at ${defiStrategy.address}`)

}

module.exports.tags = ["all", "strategy"]