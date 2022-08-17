//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

error NotOwner();

import "./interfaces/IWETH.sol";
import "./libraries/LibUniswap.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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

    // For this example, we will set the pool fee to 0.3%.
    uint24 public constant poolFee = 3000;

    constructor(
        address _swapRouter,
        address _wethAddr,
        address _usdcAddr
    ) {
        i_owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        i_weth = IWETH(_wethAddr);
        i_usdc = IERC20(_usdcAddr);
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

        convertInternal(msg.value);
        LibUniswap.print_hello();

        users.push(msg.sender);
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
    function convertInternal(uint inputAmount) internal {
        console.log("Before deposit -------------------");
        uint256 thisBalance = address(this).balance;
        uint256 wethBalance = address(i_weth).balance;
        uint256 senderBalance = msg.sender.balance;

        // the input is ETH, should convert to WETH
        i_weth.deposit{value: inputAmount}();

        console.log("After deposit -------------------");
        thisBalance = address(this).balance;
        console.log("Got thisBalance %s ETH", thisBalance);

        wethBalance = address(i_weth).balance;
        console.log("Got wethBalance %s WETH", wethBalance);
        i_weth.transfer(address(this), wethBalance);

        senderBalance = msg.sender.balance;
        console.log("Got sender %s WETH", senderBalance);

        // IERC20 inputERC20 = IERC20(address(i_weth));
        // require(
        //     inputERC20.approve(address(swapRouter), wethBalance),
        //     "weth should approve"
        // );

        uint256 amountOut = this.swapExactInputSingle(wethBalance);

        console.log("amountOut in usdc %s ", amountOut);
    }

    function swapExactInputSingle(uint256 amountIn)
        external
        returns (uint256 amountOut)
    {
        // // Transfer the specified amount of DAI to this contract.
        // TransferHelper.safeTransferFrom(
        //     address(i_weth), // token address
        //     msg.sender, // spender msg.sender
        //     address(this), // receiver
        //     amountIn
        // );

        console.log("before approve");

        // Approve the router to spend DAI.
        TransferHelper.safeApprove(
            address(i_weth), // token address
            address(swapRouter),
            amountIn
        );

        console.log("after approve");

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
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

        console.log("before swap");
        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
    }

    function getDexAddress() public view returns (ISwapRouter) {
        return swapRouter;
    }

    function ethBalance() public view returns (uint256 _balance) {
        _balance = address(this).balance;
        return _balance;
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

    fallback() external payable {
        deposit();
    }

    receive() external payable {
        deposit();
    }
}
