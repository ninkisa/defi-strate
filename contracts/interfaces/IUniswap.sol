// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IUniswap {
    /* Events ------------------------------------------- */
    event UniswapSwap(bytes path, uint256 inputAmount, uint256 outputAmount);
    event UniswapAddLiquidity(
        uint256 tokenId,
        uint256 amount0Added,
        uint256 amount1Added,
        uint256 liquidityAdded
    );
    event UniswapRemoveLiquidity(
        uint256 tokenId,
        uint256 amount0Removed,
        uint256 amount1Removed,
        uint256 liquidityRemoved
    );

    /* Write ------------------------------------------- */
    struct UniswapInitParams {
        address uniswapNft;
        address uniswapFactory;
        address uniswapRouter;
    }

    function uniswapInit(UniswapInitParams calldata params_) external;

    struct UniswapSwapExactInputParams {
        bytes path;
        uint256 inputAmount;
        uint256 outputAmountMin;
    }

    function uniswapSwapExactInput(UniswapSwapExactInputParams calldata params_)
        external;

    struct UniswapSwapExactOutputParams {
        bytes path;
        uint256 outputAmount;
        uint256 inputAmountMax;
    }

    function uniswapSwapExactOutput(
        UniswapSwapExactOutputParams calldata params_
    ) external;

    struct UniswapAddLiquidity1Params {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0;
        uint256 amount1;
        uint256 amount0Min;
        uint256 amount1Min;
    }

    function uniswapAddLiquidity1(UniswapAddLiquidity1Params calldata params_)
        external;

    struct UniswapAddLiquidity2Params {
        uint256 tokenId;
        uint256 amount0;
        uint256 amount1;
        uint256 amount0Min;
        uint256 amount1Min;
    }

    function uniswapAddLiquidity2(UniswapAddLiquidity2Params calldata params_)
        external;

    struct UniswapRemoveLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
    }

    function uniswapRemoveLiquidity(
        UniswapRemoveLiquidityParams calldata params_
    ) external;

    /* Read ------------------------------------------- */
    struct UniswapPosition {
        uint256 tokenId;
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
    }

    function uniswapGetPositions()
        external
        view
        returns (UniswapPosition[] memory);
}
