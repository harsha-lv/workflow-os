# FlowForge Blockchain Verification

Blockchain is used in FlowForge as an integrity and verification layer for workflow execution.

The workflow engine remains responsible for executing workflows. After execution, FlowForge can generate an execution receipt containing a cryptographic representation of the execution.

When on-chain verification is enabled, the receipt can be associated with blockchain metadata including:

- Chain ID
- Transaction hash
- Block number
- Contract address
- Verification status
- Verification timestamp

This allows important workflow execution records to be independently verified and provides a tamper-evident record of the execution.

Blockchain therefore complements the workflow engine rather than replacing it.
