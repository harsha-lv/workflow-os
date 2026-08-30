// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ExecutionRegistry
/// @notice Stores cryptographic proofs of FlowForge executions. No workflow payloads.
contract ExecutionRegistry {
    event ExecutionAnchored(
        bytes32 indexed executionId,
        bytes32 indexed root,
        bytes32 versionHash,
        address indexed sender
    );

    function anchor(bytes32 executionId, bytes32 root, bytes32 versionHash) external {
        emit ExecutionAnchored(executionId, root, versionHash, msg.sender);
    }
}
