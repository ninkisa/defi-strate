const { assert, expect } = require("chai")
const { ethers } = require('hardhat')

const { developmentChains } = require("../helper-hardhat-config")
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

        before(async () => {
            const accounts = await ethers.getSigners()
            userAccount = accounts[0]
            adminAccount = accounts[1]
            deployer = (await getNamedAccounts()).deployer

                ; ({ weth9, factory: uniswapFactory, router, positionManager } = await UniswapV3Deployer.deploy(adminAccount))

            // TestERC20 = await ethers.getContractFactory('TestERC20')
        })

        beforeEach(async function () {
            // Deploy Uniswap V3 contracts

            let Strategy = await ethers.getContractFactory("Strategy");
            defiStrategy = await Strategy.deploy(router.address, weth9.address);
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