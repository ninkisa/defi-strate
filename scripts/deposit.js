
const { ethers, getNamedAccounts, network } = require("hardhat")


async function main() {
    const { deployer } = await getNamedAccounts()
    const defiStrategy = await ethers.getContractFactory("Strategy")
    const contract = await defiStrategy.attach(
        "0x24a15f3FA07F85A5C2E569A1429d39a553A9c5A6" // The deployed contract address
    );

    console.log(`Got contract DeFi Strategy at ${defiStrategy.address}`)
    console.log("Deposit to contract...")
    const transactionResponse = await contract.deposit({
        value: ethers.utils.parseEther("1"),
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