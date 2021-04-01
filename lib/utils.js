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
exports.validateMnemonic = exports.deriveEd25519 = exports.generateMnemonic = exports.preprocessMnemonic = exports.Secp256k1HDKey = void 0;
var bip39_light_1 = __importDefault(require("bip39-light"));
var HDKey = __importStar(require("hdkey"));
exports.Secp256k1HDKey = HDKey;
var ed25519_hd_key_1 = require("ed25519-hd-key");
var tweetnacl_1 = require("tweetnacl");
function preprocessMnemonic(mnemonic) {
    return mnemonic
        .trim()
        .split(/\s+/)
        .map(function (part) { return part.toLowerCase(); })
        .join(' ');
}
exports.preprocessMnemonic = preprocessMnemonic;
function generateMnemonic() {
    return bip39_light_1.default.generateMnemonic();
}
exports.generateMnemonic = generateMnemonic;
function deriveEd25519(path, mnemonic, account) {
    var processed = preprocessMnemonic(mnemonic);
    var seed = bip39_light_1.default.mnemonicToSeed(processed);
    var key = ed25519_hd_key_1.derivePath(path, seed.toString('hex')).key;
    var naclKeypair = tweetnacl_1.sign.keyPair.fromSeed(key);
    return naclKeypair;
}
exports.deriveEd25519 = deriveEd25519;
function validateMnemonic(mnemonic) {
    try {
        bip39_light_1.default.mnemonicToEntropy(mnemonic);
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.validateMnemonic = validateMnemonic;
//# sourceMappingURL=utils.js.map