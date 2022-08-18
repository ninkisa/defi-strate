// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC20.sol";

library LibVault {
    bytes32 constant STORAGE_POSITION = keccak256("strategy.vault");

    struct Storage {
        bool initialized;
        /* Set of users that at some point deposited tokens */
        address[] users;
        /* Append only set of tokens stored at some point by the vault */
        address[] tokens;
        /* Current user token amount to claim */
        mapping(address => mapping(address => uint256)) userClaims;
        /* Current token amount to claim for all users */
        mapping(address => uint256) addressToAmountDeposited;
    }

    /* Events ------------------------------------------- */
    event Deposit(address sender, address token, uint256 amount);
    event Withdraw(address token, uint256 amount, address receiver);

    /* Params ------------------------------------------- */
    struct DepositParams {
        address token;
        uint256 amount;
    }
    struct WithdrawParams {
        address token;
        uint256 amount;
        address receiver;
    }

    function vaultStorage() internal pure returns (Storage storage s) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            s.slot := position
        }
    }

    function deposit(DepositParams calldata params_) external {
        require(uint256(uint160(params_.token)) != 0, "Vault: invalid token");
        require(params_.amount > 0, "Vault: invalid amount");
        LibVault.Storage storage vs = LibVault.vaultStorage();

        vs.users.push(msg.sender);
        vs.tokens.push(params_.token);

        emit Deposit(msg.sender, params_.token, params_.amount);
    }

    function withdraw(WithdrawParams calldata params_) external {
        // LibVault.Storage storage vs = LibVault.vaultStorage();

        // require(params_.amount <= tokenBalance, "Vault: invalid amount");
        // require(vs.users.contains(params_.receiver), "Vault: invalid receiver");

        // if (!IERC20(params_.token).transfer(params_.receiver, params_.amount)) {
        //     revert("Vault: transfer");
        // }

        emit Withdraw(
            /* address token    */
            params_.token,
            /* uint256 amount   */
            params_.amount,
            /* address receiver */
            params_.receiver
        );
    }
}
