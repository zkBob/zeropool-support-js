export declare enum ChainId {
    Mainnet = "Mainnet",
    Testnet = "Testnet",
    Stagenet = "Stagenet"
}
export declare namespace ChainId {
    function chainIdNumber(chainId: ChainId): number;
}
export interface Config {
    nodeUrl: string;
    chainId: ChainId;
}
