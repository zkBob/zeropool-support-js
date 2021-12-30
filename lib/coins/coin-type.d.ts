export declare const ZEROPOOL_PURPOSE = 2448;
export declare enum CoinType {
    ethereum = "ethereum",
    xdai = "xdai",
    aurora = "aurora",
    near = "near",
    waves = "waves"
}
export declare namespace CoinType {
    function derivationPath(coin: CoinType, account: number): string;
    function chainPath(coin: CoinType): string;
    function privateDerivationPath(coin: CoinType): string;
    function accountPath(coin: CoinType, account: number): string;
    function coinNumber(coin: CoinType): number;
}
