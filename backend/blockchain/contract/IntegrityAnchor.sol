// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IntegrityAnchor
 * @author LogForge Cybersecurity Engineering
 * @notice Minimal, auditable smart contract for anchoring cryptographic Merkle roots
 *         of security log event batches.
 *
 * ZERO financial primitives, ZERO tokens/NFTs, ZERO raw log exposure.
 * Only stores immutable 32-byte cryptographic batch roots and timestamps.
 */
contract IntegrityAnchor {
    /// @notice Emitted whenever a batch root is anchored
    event RootAnchored(
        bytes32 indexed batchId,
        bytes32 indexed rootHash,
        uint256 timestamp,
        address indexed submitter
    );

    struct AnchorRecord {
        bytes32 rootHash;
        uint256 timestamp;
        bool exists;
    }

    /// @notice Mapping from batch identifier to cryptographic anchor record
    mapping(bytes32 => AnchorRecord) private _anchors;

    /// @notice Total number of batches anchored
    uint256 public totalAnchored;

    /**
     * @notice Anchors a deterministic Merkle root hash for a batch of logs.
     * @param batchId 32-byte unique batch identifier (e.g. hash of UUID)
     * @param rootHash 32-byte SHA-256 Merkle root of the batch
     */
    function anchorRoot(bytes32 batchId, bytes32 rootHash) external {
        require(batchId != bytes32(0), "Invalid batch identifier");
        require(rootHash != bytes32(0), "Invalid root hash");
        require(!_anchors[batchId].exists, "Batch already anchored");

        _anchors[batchId] = AnchorRecord({
            rootHash: rootHash,
            timestamp: block.timestamp,
            exists: true
        });

        totalAnchored += 1;

        emit RootAnchored(batchId, rootHash, block.timestamp, msg.sender);
    }

    /**
     * @notice Retrieves the stored root hash and anchoring timestamp for a given batch.
     * @param batchId 32-byte unique batch identifier
     */
    function getRoot(bytes32 batchId) external view returns (bytes32 rootHash, uint256 timestamp) {
        require(_anchors[batchId].exists, "Batch not found");
        AnchorRecord memory record = _anchors[batchId];
        return (record.rootHash, record.timestamp);
    }

    /**
     * @notice Verifies whether a given root hash matches the on-chain anchor for batchId.
     * @param batchId 32-byte unique batch identifier
     * @param rootHash 32-byte Merkle root to test
     */
    function verifyRoot(bytes32 batchId, bytes32 rootHash) external view returns (bool) {
        if (!_anchors[batchId].exists) {
            return false;
        }
        return _anchors[batchId].rootHash == rootHash;
    }
}
