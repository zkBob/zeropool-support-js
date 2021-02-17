export declare enum CoinType {
    ethereum = 60,
    near = 397
}
export declare namespace CoinType {
    function derivationPath(coin: CoinType, address: number): string;
}
