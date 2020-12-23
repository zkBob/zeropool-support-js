import { CoinType } from "@trustwallet/wallet-core";

export interface Coin {
  getBalance(address: string): Promise<string>;
  transfer(to: string, amount: string): Promise<void>;
  coinType(): CoinType;
  getPrivateKey(): string;
  getPublicKey(): string;
  getAddress(): string;
}
