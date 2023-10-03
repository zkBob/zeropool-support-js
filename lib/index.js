"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientFactory = exports.TronClient = exports.EthereumClient = exports.Client = void 0;
const evm_1 = require("./networks/evm");
const tron_1 = require("./networks/tron");
const hdwallet_provider_1 = __importDefault(require("@truffle/hdwallet-provider"));
const bip32_1 = require("@scure/bip32");
const bip39_1 = require("@scure/bip39");
var client_1 = require("./networks/client");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return client_1.Client; } });
var evm_2 = require("./networks/evm");
Object.defineProperty(exports, "EthereumClient", { enumerable: true, get: function () { return evm_2.EthereumClient; } });
var tron_2 = require("./networks/tron");
Object.defineProperty(exports, "TronClient", { enumerable: true, get: function () { return tron_2.TronClient; } });
var SupportedNetwork;
(function (SupportedNetwork) {
    SupportedNetwork[SupportedNetwork["EvmNetwork"] = 0] = "EvmNetwork";
    SupportedNetwork[SupportedNetwork["TronNetwork"] = 1] = "TronNetwork";
})(SupportedNetwork || (SupportedNetwork = {}));
function networkType(chainId) {
    if ([0x2b6653dc, 0x94a9059e, 0xcd8690dc].includes(chainId)) {
        return SupportedNetwork.TronNetwork;
    }
    else if ([1, 137, 10, 11155111, 5, 420, 1337, 31337].includes(chainId)) {
        return SupportedNetwork.EvmNetwork;
    }
    return undefined;
}
class ClientFactory {
    static createClient(chainId, rpcUrl, mnemonic, config) {
        const type = networkType(chainId);
        switch (type) {
            case SupportedNetwork.TronNetwork: {
                let seed = (0, bip39_1.mnemonicToSeedSync)(mnemonic);
                let ephemeralWalletPath = `m/44'/195'/0'/0`;
                const hdwallet = bip32_1.HDKey.fromMasterSeed(seed).derive(ephemeralWalletPath);
                const privKey = hdwallet.deriveChild(0).privateKey;
                if (privKey) {
                    return new tron_1.TronClient(rpcUrl, Buffer.from(privKey).toString('hex'), config);
                }
                else {
                    throw new Error(`Cannot derive BIP39 account`);
                }
            }
            case undefined:
                console.warn(`[ClientFactory] Unknown chain id provided (${chainId}). Assume it's an EVM network...`);
            case SupportedNetwork.EvmNetwork: {
                const provider = new hdwallet_provider_1.default({
                    mnemonic,
                    providerOrUrl: rpcUrl,
                });
                return new evm_1.EthereumClient(provider, config);
            }
            default:
                throw new Error(`Unknown network type ${type}`);
        }
    }
}
exports.ClientFactory = ClientFactory;
//# sourceMappingURL=index.js.map