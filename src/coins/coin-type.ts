export enum CoinType {
  ethereum = 60,
  near = 397,
  waves = 5741564,
}

export namespace CoinType {
  export function derivationPath(coin: CoinType, account: number): string {
    return CoinType.chainPath(coin) + CoinType.accountPath(coin, account);
  }

  export function chainPath(coin: CoinType): string {
    switch (coin) {
      case CoinType.ethereum:
        return `m/44'/60'`;
      case CoinType.near:
        return `m/44'/397'`;
      case CoinType.waves:
        return `m/44'/5741564'`
    }
  }

  export function accountPath(coin: CoinType, account: number): string {
    switch (coin) {
      case CoinType.ethereum:
        return `/${account}'/0/0`;
      case CoinType.near:
        return `/${account}'`;
      case CoinType.waves:
        return `/${account}'/0'/0'`
    }
  }
}
