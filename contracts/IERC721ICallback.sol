//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./ERC721I.sol";

interface IERC721ICallback is IERC721I {
    struct CallbackInfo {
        address callbackContract;
        bytes4 callbackFunction;
    }

    error CallbackFailed(address callbackContract, bytes4 callbackFunction);
    error InvalidCallbackDatasLength(uint256 expected, uint256 actual);
}
