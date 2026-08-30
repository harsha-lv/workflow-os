export type AnchorRequest = {
  executionId: string;
  root: string;
  versionHash: string;
};

export type AnchorResult = {
  mocked: boolean;
  chainId: string;
  txHash: string;
  blockNumber: string | null;
  contractAddress: string | null;
  explorerUrl: string | null;
};

export type ChainVerifyResult = {
  ok: boolean;
  mocked: boolean;
  chainId: string | null;
  txHash: string | null;
  blockNumber: string | null;
  message: string;
};

export type ChainNetworkInfo = {
  mocked: boolean;
  chainId: string;
  name: string;
  explorerUrl: string | null;
};

export type ChainAdapter = {
  mode: "disabled" | "demo" | "evm";
  anchor(request: AnchorRequest): Promise<AnchorResult>;
  verify(txHash: string, expectedRoot?: string): Promise<ChainVerifyResult>;
  getTransaction(txHash: string): Promise<ChainVerifyResult>;
  getNetworkInfo(): Promise<ChainNetworkInfo>;
};
