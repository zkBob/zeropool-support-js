export enum CoinType {
  ethereum = 60,
  near = 397,
}

export namespace CoinType {
  export function derivationPath(coin: CoinType, address: number): string {
    switch (coin) {
      case CoinType.ethereum:
        return `m/44'/60'/${address}'/0/0`;
      case CoinType.near:
        return `m/44'/397'/${address}'`;
    }
  }
}
