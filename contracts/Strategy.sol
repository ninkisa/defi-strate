//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

error NotOwner();

error StoppedInEmergency();

import "./interfaces/IWETH.sol";
import "./libraries/LibUniswap.sol";

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";

import "hardhat/console.sol";

contract Strategy {
    // The Transfer event helps off-chain applications understand
    // what happens within your contract.
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    bool isStopped = false;

    mapping(address => uint256) private addressToAmountDeposited;
    address[] private users;
    uint256 public minRequiredEth = 0.01 * 10**18;

    address private immutable i_owner;
    ISwapRouter private immutable swapRouter;
    IWETH private immutable i_weth;
    IERC20 private immutable i_usdc;
    IPoolAddressesProvider private immutable i_lpAddrProvider;

    // For this example, we will set the pool fee to 0.3%.
    uint24 private poolFee = 3000;

    constructor(
        address _swapRouter,
        address _aaveLPAddrProvider,
        address _wethAddr,
        address _usdcAddr
    ) {
        i_owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        i_weth = IWETH(_wethAddr);
        i_usdc = IERC20(_usdcAddr);
        i_lpAddrProvider = IPoolAddressesProvider(_aaveLPAddrProvider);
    }

    function deposit() public payable stoppedInEmergency {
        console.log(
            "Deposit from %s with %s ; minimum %s tokens",
            msg.sender,
            msg.value,
            minRequiredEth
        );
        require(msg.value >= minRequiredEth, "You need to spend more ETH!");

        addressToAmountDeposited[msg.sender] += msg.value;
        users.push(msg.sender);
        uint256 amountOut = swapToUsdc(msg.value);
        console.log("amountOut in usdc %s ", amountOut);
    }

    function withdraw(uint256 _amount) external {
        require(
            addressToAmountDeposited[msg.sender] >= _amount + poolFee,
            "Not enough ether"
        );
        // TODO calculate if withdrawed amount + fees doens't exceed user's deposit
        addressToAmountDeposited[msg.sender] -= _amount;
        swapUsdcToEth(_amount);
    }

    /**
     * Converts from `inputCurrency` to `usdc` using Uniswap
     *
     * @param inputAmount The input amount
     */
    function swapUsdcToEth(uint inputAmount)
        internal
        returns (uint256 amountOut)
    {
        // this.withdrawFromAave(amount);
        console.log("------------------------------------1");
        console.log(
            "approve swap usdc %s, router %s, amount %s ",
            address(i_usdc),
            address(swapRouter),
            inputAmount
        );

        // Approve the router to spend USDC.
        TransferHelper.safeApprove(
            address(i_usdc), // token address
            address(swapRouter),
            inputAmount
        );

        console.log("swap approved ...");

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: address(i_usdc),
                tokenOut: address(i_weth),
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: inputAmount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        amountOut = swapRouter.exactInputSingle(params);
        // the input is WETH, should convert back to ETH
        // i_weth.withdraw(amountOut);
        i_weth.transfer(msg.sender, amountOut);

        return amountOut;
    }

    /**
     * Converts from `inputCurrency` to `usdc` using Uniswap
     *
     * @param inputAmount The input amount
     */
    function swapToUsdc(uint inputAmount) internal returns (uint256 amountOut) {
        // the input is ETH, should convert to WETH
        uint256 wethBalance = address(i_weth).balance;
        i_weth.deposit{value: inputAmount}();

        wethBalance = address(i_weth).balance;
        console.log("Got wethBalance %s WETH", wethBalance);

        console.log(
            "approve swap token %s, router %s, amount %s ",
            address(i_weth),
            address(swapRouter),
            inputAmount
        );

        // Approve the router to spend WETH.
        TransferHelper.safeApprove(
            address(i_weth), // token address
            address(swapRouter),
            inputAmount
        );

        console.log("swap approved ...");

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: address(i_weth),
                tokenOut: address(i_usdc),
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: inputAmount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        amountOut = swapRouter.exactInputSingle(params);

        // FIXME
        // this.depositToAave(amountOut);
    }

    function depositToAave(uint256 amount) external {
        address lendingPoolAddress = i_lpAddrProvider.getPool();
        IPool lendingPoolInstance = IPool(lendingPoolAddress);
        uint16 referral = 0;

        i_usdc.approve(address(lendingPoolInstance), amount);

        console.log("supply usdc to lendingPool %s", lendingPoolAddress);

        lendingPoolInstance.supply(
            address(i_usdc), // token
            amount, // amount
            address(this), // user
            referral
        );
    }

    function getDexAddress() public view returns (ISwapRouter) {
        return swapRouter;
    }

    function getAddressToAmountDeposited(address fundingAddress)
        public
        view
        returns (uint256)
    {
        return addressToAmountDeposited[fundingAddress];
    }

    function getTotatDeposited() public view returns (uint256 totalAmount) {
        for (uint256 idx = 0; idx < users.length; idx++) {
            totalAmount = totalAmount + addressToAmountDeposited[users[idx]];
        }
        return totalAmount;
    }

    function getPoolFee() public view returns (uint24) {
        return poolFee;
    }

    function setPoolFee(uint24 _poolFee) public onlyOwner {
        poolFee = _poolFee;
    }

    function getMinRequiredEth() public view returns (uint256) {
        return minRequiredEth;
    }

    function setMinRequiredEth(uint256 _minRequiredEth) public onlyOwner {
        minRequiredEth = _minRequiredEth;
    }

    function getUser(uint256 index) public view returns (address) {
        return users[index];
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function ethBalance() public view returns (uint256 _balance) {
        _balance = address(this).balance;
        return _balance;
    }

    function stopContract() public onlyOwner {
        isStopped = true;
    }

    function resumeContract() public onlyOwner {
        isStopped = false;
    }

    // fallback() external payable {
    //     deposit();
    // }

    // receive() external payable {
    //     deposit();
    // }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        if (msg.sender != i_owner) revert NotOwner();
        _;
    }

    modifier stoppedInEmergency() {
        if (isStopped) revert StoppedInEmergency();
        _;
    }
}
