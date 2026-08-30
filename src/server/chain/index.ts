import { createEvmAdapter } from "./evm";
import { createMockAdapter } from "./mock";
import type { ChainAdapter } from "./types";
import {
  blockchainEnabled,
  blockchainMode,
  chainContractAddress,
  chainExplorerUrl,
  chainId,
  chainPrivateKey,
  chainRpcUrl,
} from "@/server/config";

export type { ChainAdapter, AnchorRequest, AnchorResult, ChainVerifyResult, ChainNetworkInfo } from "./types";
export { createMockAdapter } from "./mock";
export { createEvmAdapter } from "./evm";

export function getChainAdapter(): ChainAdapter | null {
  if (!blockchainEnabled()) return null;
  const mode = blockchainMode();
  if (mode === "demo" || mode === "mock") return createMockAdapter(chainId() || "demo");
  const rpc = chainRpcUrl();
  const id = Number(chainId());
  const contract = chainContractAddress();
  const key = chainPrivateKey();
  if (!rpc || !Number.isFinite(id) || !contract || !key) {
    throw new Error("Real EVM anchoring requires CHAIN_RPC_URL, CHAIN_ID, CHAIN_CONTRACT_ADDRESS, and CHAIN_PRIVATE_KEY.");
  }
  return createEvmAdapter({
    rpcUrl: rpc,
    chainId: id,
    contractAddress: contract,
    privateKey: key,
    explorerUrl: chainExplorerUrl(),
  });
}

export function explorerUrlFor(txHash: string | null | undefined): string | null {
  const base = chainExplorerUrl();
  if (!base || !txHash) return null;
  return `${base.replace(/\/$/, "")}/tx/${txHash}`;
}
