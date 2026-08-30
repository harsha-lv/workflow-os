import { sha256Hex } from "@/domain/verify/canonical";
import type { AnchorRequest, AnchorResult, ChainAdapter, ChainNetworkInfo, ChainVerifyResult } from "./types";

function demoTxHash(request: AnchorRequest): string {
  return `0x${sha256Hex(`flowforge-demo:${request.executionId}:${request.root}:${request.versionHash}`)}`;
}

export function createMockAdapter(chainId = "demo"): ChainAdapter {
  return {
    mode: "demo",
    async anchor(request: AnchorRequest): Promise<AnchorResult> {
      const txHash = demoTxHash(request);
      return {
        mocked: true,
        chainId,
        txHash,
        blockNumber: "0",
        contractAddress: "demo",
        explorerUrl: null,
      };
    },
    async verify(txHash: string): Promise<ChainVerifyResult> {
      const ok = /^0x[0-9a-f]{64}$/i.test(txHash);
      return {
        ok,
        mocked: true,
        chainId,
        txHash,
        blockNumber: ok ? "0" : null,
        message: ok
          ? "Demo proof matches the local receipt. This is not a real blockchain transaction."
          : "Demo transaction identifier is malformed.",
      };
    },
    async getTransaction(txHash: string): Promise<ChainVerifyResult> {
      return this.verify(txHash);
    },
    async getNetworkInfo(): Promise<ChainNetworkInfo> {
      return { mocked: true, chainId, name: "FlowForge demo", explorerUrl: null };
    },
  };
}
