const { assert, expect } = require("chai")
const { ethers } = require('hardhat')

const { developmentChains, INITIAL_SUPPLY } = require("../helper-hardhat-config")
const UniswapV3Deployer = require('@uniswap/hardhat-v3-deploy/dist/deployer/UniswapV3Deployer.js').UniswapV3Deployer


!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Strategy contract", function () {
        let defiStrategy
        let router
        const sendValue = ethers.utils.parseEther("1")
        let adminAccount
        let userAccount
        let deployer
        let weth9
        let usdcToken

        before(async () => {
            const accounts = await ethers.getSigners()
            userAccount = accounts[0]
            adminAccount = accounts[1]
            deployer = (await getNamedAccounts()).deployer

                ; ({ weth9, factory: uniswapFactory, router, positionManager } = await UniswapV3Deployer.deploy(adminAccount))

            let TestToken = await ethers.getContractFactory("TestToken");
            usdcToken = await TestToken.deploy(INITIAL_SUPPLY);
            await usdcToken.deployed()

        })

        beforeEach(async function () {
            // Deploy Uniswap V3 contracts

            const LibUniswap = await ethers.getContractFactory("LibUniswap");
            const uibUniswap = await LibUniswap.deploy();
            await uibUniswap.deployed();

            let Strategy = await ethers.getContractFactory("Strategy", {
                libraries: {
                    LibUniswap: uibUniswap.address,
                },
            });
            defiStrategy = await Strategy.deploy(router.address, weth9.address, usdcToken.address);
            await defiStrategy.deployed()

        })

        describe("constructor", function () {
            it("sets the uniswap addresses correctly", async () => {
                const response = await defiStrategy.getDexAddress()
                assert.equal(response, router.address)
            })
        })


        describe("deposit", function () {
            it("Fails if you don't send enough ETH", async () => {
                await expect(defiStrategy.deposit()).to.be.revertedWith(
                    "You need to spend more ETH!"
                )
            })
            it("Updates the amount deposited data structure", async () => {
                await defiStrategy.deposit({ value: sendValue })
                const response = await defiStrategy.getAddressToAmountFunded(
                    deployer
                )
                console.log("Weth balance %s ", weth9.address.balance);

                assert.equal(response.toString(), sendValue.toString())
            })
            it("Adds funder to array of funders", async () => {
                await defiStrategy.deposit({ value: sendValue })
                const response = await defiStrategy.getUser(0)
                assert.equal(response, deployer)
            })
        })
    });