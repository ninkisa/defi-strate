
const { ethers, getNamedAccounts } = require("hardhat")

async function main() {
    const { deployer } = await getNamedAccounts()
    const defiStrategy = await ethers.getContract("Strategy", deployer)
    console.log(`Got contract DeFi Strategy at ${defiStrategy.address}`)
    console.log("Deposit to contract...")
    const transactionResponse = await defiStrategy.deposit({
        value: ethers.utils.parseEther("0.1"),
    })
    await transactionResponse.wait()
    console.log("Done!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })