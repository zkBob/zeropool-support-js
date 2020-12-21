import { CoinType } from "@trustwallet/wallet-core";

export interface Wallet {
  getBalance(address: string): Promise<string>;
  transfer(from: string, to: string, amount: string): Promise<void>;
  coinType(): CoinType;
  getPrivateKey(): string;
  getPublicKey(): string;
  getAddress(): string;
}
