export declare enum CoinType {
    ethereum = 60,
    near = 397
}
export declare namespace CoinType {
    function derivationPath(coin: CoinType, account: number): string;
    function chainPath(coin: CoinType): string;
    function accountPath(coin: CoinType, account: number): string;
}
