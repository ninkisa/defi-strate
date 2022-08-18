const { assert, expect } = require("chai")
const { ethers, waffle } = require('hardhat')

const { developmentChains, networkConfig } = require("../helper-hardhat-config")

const UNISWAP_NFT = require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json");
const UNISWAP_FACTORY = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
const UNISWAP_ROUTER = require("@uniswap/swap-router-contracts/artifacts/contracts/SwapRouter02.sol/SwapRouter02.json");

const WETH9 = require("../contracts/utils/WETH9.json");


!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Strategy contract", function () {
        let defiStrategy
        const sendValue = ethers.utils.parseEther("1")
        let adminAccount
        let userAccount
        let deployer

        let testTokenFactory, wethToken, usdcToken;

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
        const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";


        let uniswapFactoryFactory, uniswapFactoryInstance;
        let uniswapRouterFactory, uniswapRouterInstance;
        let uniswapNftFactory, uniswapNftInstance;


        beforeEach(async () => {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            userAccount = accounts[2]
            adminAccount = accounts[3]

            testTokenFactory = await ethers.getContractFactory("TestToken");
            wethToken = await waffle.deployContract(deployer, WETH9);
            await wethToken.deployed();

            usdcToken = await testTokenFactory.deploy("TestUSDC", "T1", 18);
            await usdcToken.deployed();

            await wethToken.connect(deployer).deposit({ value: INITIAL_DEPLOYER_AMOUNT })
            await (await usdcToken.mint(deployer.address, INITIAL_DEPLOYER_AMOUNT)).wait();

            expect(await wethToken.balanceOf(deployer.address)).to.deep.equal(INITIAL_DEPLOYER_AMOUNT);
            expect(await usdcToken.balanceOf(deployer.address)).to.deep.equal(INITIAL_DEPLOYER_AMOUNT);



            uniswapFactoryFactory = new ethers.ContractFactory(UNISWAP_FACTORY.abi, UNISWAP_FACTORY.bytecode, deployer);
            uniswapFactoryInstance = await uniswapFactoryFactory.deploy();
            await uniswapFactoryInstance.deployed();

            uniswapNftFactory = new ethers.ContractFactory(UNISWAP_NFT.abi, UNISWAP_NFT.bytecode, deployer);
            uniswapNftInstance = await uniswapNftFactory.deploy(uniswapFactoryInstance.address, wethToken.address, ZERO_ADDRESS);
            await uniswapNftInstance.deployed();



            console.log("-- from test weth address %s", wethToken.address);
            console.log("-- from test usdc address %s", usdcToken.address);

            uniswapRouterFactory = new ethers.ContractFactory(UNISWAP_ROUTER.abi, UNISWAP_ROUTER.bytecode, deployer);
            uniswapRouterInstance = await uniswapRouterFactory.deploy(
                /* address _factoryV2       */ZERO_ADDRESS,
                /* address factoryV3        */uniswapFactoryInstance.address,
                /* address _positionManager */uniswapNftInstance.address,
                /* address _WETH9           */wethToken.address
            );
            await uniswapRouterInstance.deployed();

            console.log("-- from test uniswapFactoryInstance address %s", uniswapFactoryInstance.address);
            console.log("-- from test uniswapNftInstance address %s", uniswapNftInstance.address);
            console.log("-- from test uniswapRouterInstance address %s", uniswapRouterInstance.address);


            let blockNumber = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNumber);



            await (await uniswapNftInstance.createAndInitializePoolIfNecessary(wethToken.address, usdcToken.address, POOL_FEE, POOL_PRICE)).wait();
            await (await wethToken.connect(deployer).approve(uniswapNftInstance.address, INITIAL_DEPLOYER_AMOUNT)).wait();
            await (await usdcToken.connect(deployer).approve(uniswapNftInstance.address, INITIAL_DEPLOYER_AMOUNT)).wait();
            await (await uniswapNftInstance.connect(deployer).mint({
                    /* address token0         */token0: wethToken.address,
                    /* address token1         */token1: usdcToken.address,
                    /* uint24 fee             */fee: POOL_FEE,
                    /* int24 tickLower        */tickLower: LOWERTICK,
                    /* int24 tickUpper        */tickUpper: UPPERTICK,
                    /* uint256 amount0Desired */amount0Desired: INITIAL_DEPLOYER_AMOUNT,
                    /* uint256 amount1Desired */amount1Desired: INITIAL_DEPLOYER_AMOUNT,
                    /* uint256 amount0Min     */amount0Min: "0",
                    /* uint256 amount1Min     */amount1Min: "0",
                    /* address recipient      */recipient: deployer.address,
                    /* uint256 deadline       */deadline: block.timestamp + TIMESTAMP_STEP
            })).wait();


            const LibUniswap = await ethers.getContractFactory("LibUniswap");
            const uibUniswap = await LibUniswap.deploy();
            await uibUniswap.deployed();

            let Strategy = await ethers.getContractFactory("Strategy");
            // let Strategy = await ethers.getContractFactory("Strategy", {
            //     libraries: {
            //         LibUniswap: uibUniswap.address,
            //     },
            // });
            const aaveLPAddrProviderAddress = networkConfig[network.config.chainId].aaveLPAddrProvider;

            defiStrategy = await Strategy.deploy(uniswapRouterInstance.address, wethToken.address, usdcToken.address);
            await defiStrategy.deployed();

        })

        // describe("constructor", function () {
        //     it("sets the uniswap addresses correctly", async () => {
        //         const response = await defiStrategy.getDexAddress()
        //         assert.equal(response, uniswapRouterInstance.address)
        //     })
        // })


        describe("deposit", function () {
            // it("Fails if you don't send enough ETH", async () => {
            //     await expect(defiStrategy.deposit()).to.be.revertedWith(
            //         "You need to spend more ETH!"
            //     )
            // })
            it("Updates the amount deposited data structure", async () => {
                await defiStrategy.deposit({ value: sendValue })
                let user = (await getNamedAccounts()).deployer
                const response = await defiStrategy.getAddressToAmountFunded(
                    user
                )
                assert.equal(response.toString(), sendValue.toString())
            })
            // it("Adds funder to array of funders", async () => {
            //     let user = (await getNamedAccounts()).deployer
            //     await defiStrategy.deposit({ value: sendValue })
            //     const response = await defiStrategy.getUser(0)
            //     assert.equal(response, user)
            // })
        })
    });