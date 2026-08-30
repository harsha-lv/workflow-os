export const executionRegistryAbi = [
  {
    type: "function",
    name: "anchor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "executionId", type: "bytes32" },
      { name: "root", type: "bytes32" },
      { name: "versionHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "ExecutionAnchored",
    inputs: [
      { name: "executionId", type: "bytes32", indexed: true },
      { name: "root", type: "bytes32", indexed: true },
      { name: "versionHash", type: "bytes32", indexed: false },
      { name: "sender", type: "address", indexed: true },
    ],
  },
] as const;
