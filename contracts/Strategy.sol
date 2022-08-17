//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

error NotOwner();

import "./interfaces/IUniswapV3Factory.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IWETH.sol";
import "./libraries/external/TransferHelper.sol";
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
    IUniswapV3Factory public i_uniswapV3Factory;

    // address private constant WETH = 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6;

    constructor(address _swapRouter, address _wethAddr) {
        i_owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        i_weth = IWETH(_wethAddr);
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
     * Converts from `inputCurrency` to `outputCurrency` using Uniswap
     *
     * @param inputCurrency The input currency
     * @param outputCurrency The output currency
     * @param inputAmount The input amount
     * @param outputAmount The output amount
     */
    function convertInternal(
        address inputCurrency,
        address outputCurrency,
        uint inputAmount,
        uint outputAmount
    ) internal {
        address[] memory path = getPathInternal(inputCurrency, outputCurrency);

        IERC20 inputERC20;
        if (inputCurrency == address(0)) {
            // If the input is ETH we convert to WETH
            i_weth.deposit{value: inputAmount}();
            inputERC20 = IERC20(address(i_weth));
        } else {
            inputERC20 = IERC20(inputCurrency);
        }

        require(
            inputERC20.approve(address(swapRouter), inputAmount),
            "router-approve"
        );

        swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: token1,
                tokenOut: token0,
                fee: decoded.poolFee2,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: decoded.amount1,
                amountOutMinimum: amount0Min,
                sqrtPriceLimitX96: 0
            })
        );

        if (outputCurrency == address(0)) {
            // If the output is ETH we withdraw from WETH
            i_weth.withdraw(outputAmount);
        }
    }

    /**
     * Returns the Uniswap path from `inputCurrency` to `outputCurrency`
     *
     * @param inputCurrency The input currency
     * @param outputCurrency The output currency
     *
     * @return The Uniswap path from `inputCurrency` to `outputCurrency`
     */
    function getPathInternal(address inputCurrency, address outputCurrency)
        internal
        view
        returns (address[] memory)
    {
        address wethAddress = address(i_weth);
        address updatedInputCurrency = inputCurrency == address(0)
            ? wethAddress
            : inputCurrency;
        address updatedOutputCurrency = outputCurrency == address(0)
            ? wethAddress
            : outputCurrency;

        IUniswapV3Factory uniswapFactory = i_uniswapV3Factory;
        if (
            uniswapFactory.getPair(
                updatedInputCurrency,
                updatedOutputCurrency
            ) != address(0)
        ) {
            // Direct path exists
            address[] memory path = new address[](2);
            path[0] = updatedInputCurrency;
            path[1] = updatedOutputCurrency;
            return path;
        }

        // Direct path does not exist
        // Check for 3-hop path: input -> weth -> output

        require(
            uniswapFactory.getPair(updatedInputCurrency, wethAddress) !=
                address(0) &&
                uniswapFactory.getPair(wethAddress, updatedOutputCurrency) !=
                address(0),
            "no-path"
        );

        // 3-hop path exists
        address[] memory path = new address[](3);
        path[0] = updatedInputCurrency;
        path[1] = wethAddress;
        path[2] = updatedOutputCurrency;

        return path;
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
