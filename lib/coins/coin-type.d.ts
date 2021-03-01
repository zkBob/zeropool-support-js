export declare enum CoinType {
    ethereum = "ethereum",
    near = "near",
    waves = "waves"
}
export declare namespace CoinType {
    function derivationPath(coin: CoinType, account: number): string;
    function chainPath(coin: CoinType): string;
    function accountPath(coin: CoinType, account: number): string;
    function coinNumber(coin: CoinType): number;
}
