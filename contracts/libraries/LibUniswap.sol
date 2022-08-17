// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
pragma abicoder v2;

// import "../interfaces/ISwapRouter.sol";
// import "./external/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "hardhat/console.sol";

library LibUniswap {
    // address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    // address public constant WETH9 = 0xf44745f250a6733798eEd9F259542A6b57089D15; // 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6
    // address public constant USDC = 0x5FfbaC75EFc9547FBc822166feD19B05Cd5890bb;

    uint24 public constant poolFee = 3000;

    function print_hello() external view {
        console.log("echoooooooooooooooooo");
    }

    function swapExactInputSingle(
        ISwapRouter swapRouter,
        address inputCurrency,
        address outputCurrency,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // Approve the router to spend DAI.
        TransferHelper.safeApprove(
            inputCurrency, // token address
            outputCurrency,
            amountIn
        );

        console.log("after approve");

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: inputCurrency,
                tokenOut: outputCurrency,
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

    /// @notice swapExactOutputSingle swaps a minimum possible amount of DAI for a fixed amount of WETH.
    /// @dev The calling address must approve this contract to spend its DAI for this function to succeed. As the amount of input DAI is variable,
    /// the calling address will need to approve for a slightly higher amount, anticipating some variance.
    /// @param amountOut The exact amount of WETH9 to receive from the swap.
    /// @param amountInMaximum The amount of DAI we are willing to spend to receive the specified amount of WETH9.
    /// @return amountIn The amount of DAI actually spent in the swap.
    function swapExactOutputSingle(
        ISwapRouter swapRouter,
        address inputCurrency,
        address outputCurrency,
        uint256 amountOut,
        uint256 amountInMaximum
    ) external returns (uint256 amountIn) {
        // Transfer the specified amount of DAI to this contract.
        TransferHelper.safeTransferFrom(
            inputCurrency,
            msg.sender,
            address(this),
            amountInMaximum
        );

        // Approve the router to spend the specifed `amountInMaximum` of DAI.
        // In production, you should choose the maximum amount to spend based on oracles or other data sources to acheive a better swap.
        TransferHelper.safeApprove(
            inputCurrency,
            address(swapRouter),
            amountInMaximum
        );

        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: inputCurrency,
                tokenOut: outputCurrency,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum,
                sqrtPriceLimitX96: 0
            });

        // Executes the swap returning the amountIn needed to spend to receive the desired amountOut.
        amountIn = swapRouter.exactOutputSingle(params);

        // For exact output swaps, the amountInMaximum may not have all been spent.
        // If the actual amount spent (amountIn) is less than the specified maximum amount, we must refund the msg.sender and approve the swapRouter to spend 0.
        if (amountIn < amountInMaximum) {
            TransferHelper.safeApprove(inputCurrency, address(swapRouter), 0);
            TransferHelper.safeTransfer(
                inputCurrency,
                msg.sender,
                amountInMaximum - amountIn
            );
        }
    }
}
