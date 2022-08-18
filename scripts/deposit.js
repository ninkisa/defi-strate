
const { ethers, getNamedAccounts, network } = require("hardhat")


async function main() {
    const { deployer } = await getNamedAccounts()
    const defiStrategy = await ethers.getContractFactory("Strategy")
    const contract = await defiStrategy.attach(
        "0x6A312D5fFF30Fc5f05866F399aAFD37673e41e3c" // The deployed contract address
    );

    console.log(`Got contract DeFi Strategy at ${defiStrategy.address}`)
    console.log("Deposit to contract...")
    const transactionResponse = await contract.deposit({
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