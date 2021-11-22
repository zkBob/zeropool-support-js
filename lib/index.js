"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prodConfig = exports.devConfig = exports.init = exports.validateAddress = exports.HDWallet = exports.Balance = exports.Coin = exports.CoinType = void 0;
if (typeof localStorage === 'undefined' || localStorage === null) {
    const LocalStorage = require('node-localstorage').LocalStorage;
    global.localStorage = new LocalStorage('./tmp');
}
var coin_type_1 = require("./coins/coin-type");
Object.defineProperty(exports, "CoinType", { enumerable: true, get: function () { return coin_type_1.CoinType; } });
var coin_1 = require("./coins/coin");
Object.defineProperty(exports, "Coin", { enumerable: true, get: function () { return coin_1.Coin; } });
Object.defineProperty(exports, "Balance", { enumerable: true, get: function () { return coin_1.Balance; } });
var hd_wallet_1 = require("./hd-wallet");
Object.defineProperty(exports, "HDWallet", { enumerable: true, get: function () { return hd_wallet_1.HDWallet; } });
var libzeropool_rs_1 = require("./libzeropool-rs");
Object.defineProperty(exports, "validateAddress", { enumerable: true, get: function () { return libzeropool_rs_1.validateAddress; } });
Object.defineProperty(exports, "init", { enumerable: true, get: function () { return libzeropool_rs_1.init; } });
// For convenience
var config_dev_1 = require("./config.dev");
Object.defineProperty(exports, "devConfig", { enumerable: true, get: function () { return __importDefault(config_dev_1).default; } });
var config_prod_1 = require("./config.prod");
Object.defineProperty(exports, "prodConfig", { enumerable: true, get: function () { return __importDefault(config_prod_1).default; } });
//# sourceMappingURL=index.js.map