"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prodConfig = exports.devConfig = exports.HDWallet = exports.CoinType = exports.near = void 0;
exports.near = __importStar(require("./coins/near"));
var coin_type_1 = require("./coins/coin-type");
Object.defineProperty(exports, "CoinType", { enumerable: true, get: function () { return coin_type_1.CoinType; } });
var hd_wallet_1 = require("./hd-wallet");
Object.defineProperty(exports, "HDWallet", { enumerable: true, get: function () { return hd_wallet_1.HDWallet; } });
var config_dev_1 = require("./config.dev");
Object.defineProperty(exports, "devConfig", { enumerable: true, get: function () { return __importDefault(config_dev_1).default; } });
var config_prod_1 = require("./config.prod");
Object.defineProperty(exports, "prodConfig", { enumerable: true, get: function () { return __importDefault(config_prod_1).default; } });
//# sourceMappingURL=index.js.map