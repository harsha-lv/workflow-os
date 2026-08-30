import { createPublicClient, createWalletClient, http, isHex, keccak256, stringToBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { executionRegistryAbi } from "./abi";
import type { AnchorRequest, AnchorResult, ChainAdapter, ChainNetworkInfo, ChainVerifyResult } from "./types";

function asHex32(value: string): Hex {
  if (isHex(value) && value.length === 66) return value;
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) return `0x${hex}`;
  return keccak256(stringToBytes(value));
}

function explorerTxUrl(base: string | null, txHash: string): string | null {
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/tx/${txHash}`;
}

export function createEvmAdapter(input: {
  rpcUrl: string;
  chainId: number;
  contractAddress: `0x${string}`;
  privateKey: `0x${string}`;
  explorerUrl: string | null;
  name?: string;
}): ChainAdapter {
  const chain = {
    id: input.chainId,
    name: input.name ?? `chain-${input.chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [input.rpcUrl] } },
  } as const;
  const account = privateKeyToAccount(input.privateKey);
  const publicClient = createPublicClient({ chain, transport: http(input.rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(input.rpcUrl) });

  return {
    mode: "evm",
    async anchor(request: AnchorRequest): Promise<AnchorResult> {
      const hash = await walletClient.writeContract({
        address: input.contractAddress,
        abi: executionRegistryAbi,
        functionName: "anchor",
        args: [asHex32(request.executionId), asHex32(request.root), asHex32(request.versionHash)],
        account,
        chain,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      return {
        mocked: false,
        chainId: String(input.chainId),
        txHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        contractAddress: input.contractAddress,
        explorerUrl: explorerTxUrl(input.explorerUrl, hash),
      };
    },
    async verify(txHash: string, expectedRoot?: string): Promise<ChainVerifyResult> {
      if (!isHex(txHash) || txHash.length !== 66) {
        return { ok: false, mocked: false, chainId: String(input.chainId), txHash, blockNumber: null, message: "Invalid transaction hash." };
      }
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hex });
      if (receipt.status !== "success") {
        return {
          ok: false,
          mocked: false,
          chainId: String(input.chainId),
          txHash,
          blockNumber: receipt.blockNumber.toString(),
          message: "On-chain transaction did not succeed.",
        };
      }
      if (expectedRoot) {
        const expected = asHex32(expectedRoot).toLowerCase();
        const match = receipt.logs.some((log) => log.topics[2]?.toLowerCase() === expected);
        if (receipt.logs.length > 0 && !match) {
          return {
            ok: false,
            mocked: false,
            chainId: String(input.chainId),
            txHash,
            blockNumber: receipt.blockNumber.toString(),
            message: "On-chain event root does not match the local receipt.",
          };
        }
      }
      return {
        ok: true,
        mocked: false,
        chainId: String(input.chainId),
        txHash,
        blockNumber: receipt.blockNumber.toString(),
        message: "On-chain transaction confirmed.",
      };
    },
    async getTransaction(txHash: string): Promise<ChainVerifyResult> {
      return this.verify(txHash);
    },
    async getNetworkInfo(): Promise<ChainNetworkInfo> {
      const id = await publicClient.getChainId();
      return {
        mocked: false,
        chainId: String(id),
        name: chain.name,
        explorerUrl: input.explorerUrl,
      };
    },
  };
}
