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

        const INITIAL_DEPLOYER_AMOUNT = "1000000000000000000000";
        const POOL_PRICE = "79228162514264337593543950336"; // 79228162514264337593543950336 == 2 ^ 96 == 1 : 1 token price in fixed point Q64.96
        const POOL_FEE = 3000;
        const POOL_FEE_TO_SPACING = {
            "500": 10,
            "3000": 60,
            "10000": 200
        };
        const MAXTICK = 887272;
        const UPPERTICK = Math.floor(MAXTICK / POOL_FEE_TO_SPACING[POOL_FEE]) * POOL_FEE_TO_SPACING[POOL_FEE];
        const LOWERTICK = -UPPERTICK;
        const TIMESTAMP_STEP = 1000000;


        before(async () => {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            userAccount = accounts[2]
            adminAccount = accounts[3]

            let TestToken = await ethers.getContractFactory("TestToken");
            usdcToken = await TestToken.deploy(INITIAL_SUPPLY);
            await usdcToken.deployed()
            let blockNumber = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNumber);


            ; ({ weth9, factory: uniswapFactory, router, positionManager } = await UniswapV3Deployer.deploy(deployer))
            console.log("------------->1 ");

            await (await positionManager.createAndInitializePoolIfNecessary(weth9.address, usdcToken.address, POOL_FEE, POOL_PRICE)).wait();
            console.log("------------->2 ");
            await (await weth9.connect(deployer).approve(positionManager.address, INITIAL_DEPLOYER_AMOUNT)).wait();
            console.log("------------->3 ");
            await (await usdcToken.connect(deployer).approve(positionManager.address, INITIAL_DEPLOYER_AMOUNT)).wait();
            console.log("------------->4 ");
            await (await positionManager.connect(deployer).mint({
                    /* address token0         */token0: weth9.address,
                    /* address token1         */token1: usdcToken.address,
                    /* uint24 fee             */fee: POOL_FEE,
                    /* int24 tickLower        */tickLower: TickMath.MIN_TICK,
                    /* int24 tickUpper        */tickUpper: TickMath.MAX_TICK,
                    /* uint256 amount0Desired */amount0Desired: INITIAL_DEPLOYER_AMOUNT,
                    /* uint256 amount1Desired */amount1Desired: INITIAL_DEPLOYER_AMOUNT,
                    /* uint256 amount0Min     */amount0Min: "0",
                    /* uint256 amount1Min     */amount1Min: "0",
                    /* address recipient      */recipient: deployer.address,
                    /* uint256 deadline       */deadline: block.timestamp + TIMESTAMP_STEP
            })).wait();
            console.log("------------->5 ");
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