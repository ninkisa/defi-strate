//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

error NotOwner();

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

    mapping(address => uint256) private addressToAmountDeposited;
    address[] private users;

    address private immutable i_owner;
    uint256 public constant MINIMUM_ETH = 1 * 10**18;
    ISwapRouter public immutable swapRouter;
    IWETH private immutable i_weth;
    IERC20 private immutable i_usdc;
    // IPoolAddressesProvider private immutable i_lpAddrProvider;

    // For this example, we will set the pool fee to 0.3%.
    uint24 public constant poolFee = 3000;

    constructor(
        address _swapRouter,
        // address _aaveLPAddrProvider,
        address _wethAddr,
        address _usdcAddr
    ) {
        i_owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        i_weth = IWETH(_wethAddr);
        i_usdc = IERC20(_usdcAddr);
        // i_lpAddrProvider = IPoolAddressesProvider(_aaveLPAddrProvider);
    }

    function deposit() public payable {
        console.log(
            "Deposit from %s with %s ; minimum %s tokens",
            msg.sender,
            msg.value,
            MINIMUM_ETH
        );
        require(msg.value >= MINIMUM_ETH, "You need to spend more ETH!");

        addressToAmountDeposited[msg.sender] += msg.value;
        users.push(msg.sender);
        uint256 amountOut = convertInternal(msg.value);
        console.log("amountOut in usdc %s ", amountOut);
    }

    function withdraw(uint256 _amount) public {
        require(
            addressToAmountDeposited[msg.sender] >= _amount,
            "Not enough ether"
        );
        addressToAmountDeposited[msg.sender] -= _amount;
        (bool sent, ) = msg.sender.call{value: _amount}("Sent");
        require(sent, "failed to send ETH");
    }

    /**
     * Converts from `inputCurrency` to `usdc` using Uniswap
     *
     * @param inputAmount The input amount
     */
    function convertInternal(uint inputAmount) internal returns (uint256) {
        // the input is ETH, should convert to WETH
        uint256 wethBalance = address(i_weth).balance;
        i_weth.deposit{value: inputAmount}();
        wethBalance = address(i_weth).balance;
        console.log("Got wethBalance %s WETH", wethBalance);

        uint256 amountOut = this.swapExactInputSingle(inputAmount);
        return amountOut;
    }

    function swapExactInputSingle(uint256 amountIn)
        external
        returns (uint256 amountOut)
    {
        console.log(
            "approve swap token %s, router %s, amount %s ",
            address(i_weth),
            address(swapRouter),
            amountIn
        );

        // Approve the router to spend DAI.
        TransferHelper.safeApprove(
            address(i_weth), // token address
            address(swapRouter),
            amountIn
        );

        console.log("swap approved ...");

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: address(i_weth),
                tokenOut: address(i_usdc),
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        console.log("swap params ...");
        console.log("tokenIn:  %s", address(i_weth));
        console.log("tokenOut: %s", address(i_usdc));
        console.log("recipient: %s", address(this));
        console.log("router: %s", address(swapRouter));
        amountOut = swapRouter.exactInputSingle(params);
        // this.depositToAave(amountOut);
    }

    // function depositToAave(uint256 amount) external {
    //     address lendingPoolAddress = i_lpAddrProvider.getPool();
    //     IPool lendingPoolInstance = IPool(lendingPoolAddress);
    //     uint16 referral = 0;

    //     i_usdc.approve(address(lendingPoolInstance), amount);
    //     i_usdc.approve(address(this), amount);
    //     i_usdc.allowance(address(this), address(this));
    //     lendingPoolInstance.supply(
    //         address(i_usdc), // token
    //         amount, // amount
    //         address(this), // user
    //         referral
    //     );
    // }

    function getDexAddress() public view returns (ISwapRouter) {
        return swapRouter;
    }

    function getAddressToAmountFunded(address fundingAddress)
        public
        view
        returns (uint256)
    {
        return addressToAmountDeposited[fundingAddress];
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

    fallback() external payable {
        deposit();
    }

    receive() external payable {
        deposit();
    }
}
