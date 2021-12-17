export const ZEROPOOL_PURPOSE = 2448;

// Using strings here for better debuggability
export enum CoinType {
  ethereum = 'ethereum',
  xdai = 'xdai',
  aurora = 'aurora',
  near = 'near',
  waves = 'waves',
}

export namespace CoinType {
  export function derivationPath(coin: CoinType, account: number): string {
    return CoinType.chainPath(coin) + CoinType.accountPath(coin, account);
  }

  export function chainPath(coin: CoinType): string {
    return `m/44'/${CoinType.coinNumber(coin)}'`;
  }

  export function privateDerivationPath(coin: CoinType): string {
    return `m/${ZEROPOOL_PURPOSE}'/${CoinType.coinNumber(coin)}'`;
  }

  export function accountPath(coin: CoinType, account: number): string {
    switch (coin) {
      case CoinType.ethereum:
      case CoinType.xdai:
      case CoinType.aurora:
        return `/0'/0/${account}`;
      case CoinType.near:
        return `/${account}'`;
      case CoinType.waves:
        return `/${account}'/0'/0'`
    }
  }

  // TODO: Use a full list of coins.
  export function coinNumber(coin: CoinType): number {
    switch (coin) {
      case CoinType.ethereum:
        return 60;
      case CoinType.xdai:
        return 700;
      case CoinType.aurora:
        return 2570;
      case CoinType.near:
        return 397;
      case CoinType.waves:
        return 5741564;
    }
  }
}
