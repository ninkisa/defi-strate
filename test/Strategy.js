const { assert, expect } = require("chai")
const { ethers, waffle } = require("hardhat")
const { utils } = require("ethers")


const { developmentChains, networkConfig } = require("../helper-hardhat-config")

const UNISWAP_NFT = require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json");
const UNISWAP_FACTORY = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
const UNISWAP_ROUTER = require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json");

const AAVE_POOL_ADDR_PROVIDER = require('@aave/core-v3/artifacts/contracts/protocol/configuration/PoolAddressesProvider.sol/PoolAddressesProvider.json');
const AAVE_POOL = require('@aave/core-v3/artifacts/contracts/mocks/helpers/MockPool.sol/MockPool.json');
// const AAVE_POOL = require('@aave/core-v3/artifacts/contracts/mocks/helpers/MockPool.sol/MockPool.json');


const WETH9 = require("../contracts/utils/WETH9.json");


!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Strategy contract", function () {
        let defiStrategy
        const sendValue = ethers.utils.parseEther("1")
        let user

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

        let aaveAddressProviderFactory, aaveAddressProviderInstance;
        let aavePoolFactory, aavePoolInstance;


        before(async () => {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            userAccount = accounts[2]
            adminAccount = accounts[3]

            user = (await getNamedAccounts()).deployer

            testTokenFactory = await ethers.getContractFactory("TestToken");
            wethToken = await waffle.deployContract(deployer, WETH9);
            await wethToken.deployed();

            usdcToken = await testTokenFactory.deploy("TestUSDC", "T1", 18);
            await usdcToken.deployed();

            await wethToken.connect(deployer).deposit({ value: INITIAL_DEPLOYER_AMOUNT })
            await (await usdcToken.mint(deployer.address, INITIAL_DEPLOYER_AMOUNT)).wait();

            expect(await wethToken.balanceOf(deployer.address)).to.deep.equal(INITIAL_DEPLOYER_AMOUNT);
            expect(await usdcToken.balanceOf(deployer.address)).to.deep.equal(INITIAL_DEPLOYER_AMOUNT);

            // setup Uniswap V3
            uniswapFactoryFactory = new ethers.ContractFactory(UNISWAP_FACTORY.abi, UNISWAP_FACTORY.bytecode, deployer);
            uniswapFactoryInstance = await uniswapFactoryFactory.deploy();
            await uniswapFactoryInstance.deployed();

            uniswapNftFactory = new ethers.ContractFactory(UNISWAP_NFT.abi, UNISWAP_NFT.bytecode, deployer);
            uniswapNftInstance = await uniswapNftFactory.deploy(uniswapFactoryInstance.address, wethToken.address, ZERO_ADDRESS);
            await uniswapNftInstance.deployed();

            uniswapRouterFactory = new ethers.ContractFactory(UNISWAP_ROUTER.abi, UNISWAP_ROUTER.bytecode, deployer);
            uniswapRouterInstance = await uniswapRouterFactory.deploy(
                // /* address _factoryV2       */ZERO_ADDRESS,
                /* address factoryV3        */uniswapFactoryInstance.address,
                // /* address _positionManager */uniswapNftInstance.address,
                /* address _WETH9           */wethToken.address
            );
            await uniswapRouterInstance.deployed();

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
            await uniswapRouterInstance.factory();

            // setup Aave
            aaveAddressProviderFactory = new ethers.ContractFactory(AAVE_POOL_ADDR_PROVIDER.abi, AAVE_POOL_ADDR_PROVIDER.bytecode, deployer);
            aaveAddressProviderInstance = await aaveAddressProviderFactory.deploy(user);
            await aaveAddressProviderInstance.deployed();
            aavePoolFactory = new ethers.ContractFactory(AAVE_POOL.abi, AAVE_POOL.bytecode, deployer);
            aavePoolInstance = await aavePoolFactory.deploy();
            await aavePoolInstance.deployed(aaveAddressProviderInstance);

            await (await aaveAddressProviderInstance.connect(deployer).setPoolImpl(aavePoolInstance.address)).wait();
            // await (await aavePoolInstance.initialize(aaveAddressProviderInstance.address)).wait();
            await (await aaveAddressProviderInstance.connect(deployer).setAddress(utils.keccak256(utils.toUtf8Bytes('RANDOM_ID')), aavePoolInstance.address)).wait();
            // await (await aavePoolInstance.mintUnbacked(usdcToken.address, INITIAL_DEPLOYER_AMOUNT, deployer, 0)).wait();

            console.log("aaveAddressProviderInstance === %s", aaveAddressProviderInstance.address);
            console.log("lendingPoolAddress === %s", aavePoolInstance.address);
            console.log("------------- Setup DONE!!!!! -------------- ");
        })

        beforeEach(async () => {
            const LibUniswap = await ethers.getContractFactory("LibUniswap");
            const uibUniswap = await LibUniswap.deploy();
            await uibUniswap.deployed();

            let Strategy = await ethers.getContractFactory("Strategy");
            // let Strategy = await ethers.getContractFactory("Strategy", {
            //     libraries: {
            //         LibUniswap: uibUniswap.address,
            //     },
            // });

            defiStrategy = await Strategy.deploy(uniswapRouterInstance.address, aaveAddressProviderInstance.address, wethToken.address, usdcToken.address);
            await defiStrategy.deployed();

        })

        describe("constructor", function () {
            it("sets the uniswap addresses correctly", async () => {
                const response = await defiStrategy.getDexAddress()
                assert.equal(response, uniswapRouterInstance.address)
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
                    user
                )
                assert.equal(response.toString(), sendValue.toString())
            })
            it("Adds funder to array of funders", async () => {
                await defiStrategy.deposit({ value: sendValue })
                const response = await defiStrategy.getUser(0)
                assert.equal(response, user)
            })
        })
    });