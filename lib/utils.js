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
exports.toTwosComplementHex = exports.HexStringReader = exports.HexStringWriter = exports.hexToBuf = exports.base64ToHex = exports.bufToHex = exports.validateMnemonic = exports.deriveSpendingKey = exports.deriveEd25519 = exports.generateMnemonic = exports.preprocessMnemonic = exports.Secp256k1HDKey = void 0;
const bip39_light_1 = __importDefault(require("bip39-light"));
const HDKey = __importStar(require("hdkey"));
exports.Secp256k1HDKey = HDKey;
const ed25519_hd_key_1 = require("ed25519-hd-key");
const tweetnacl_1 = require("tweetnacl");
const web3_utils_1 = require("web3-utils");
const hdwallet_babyjub_1 = require("hdwallet-babyjub");
const network_type_1 = require("./networks/network-type");
function preprocessMnemonic(mnemonic) {
    return mnemonic
        .trim()
        .split(/\s+/)
        .map(part => part.toLowerCase())
        .join(' ');
}
exports.preprocessMnemonic = preprocessMnemonic;
function generateMnemonic() {
    return bip39_light_1.default.generateMnemonic();
}
exports.generateMnemonic = generateMnemonic;
function deriveEd25519(path, mnemonic) {
    const processed = preprocessMnemonic(mnemonic);
    const seed = bip39_light_1.default.mnemonicToSeed(processed);
    const { key } = (0, ed25519_hd_key_1.derivePath)(path, seed.toString('hex'));
    const naclKeypair = tweetnacl_1.sign.keyPair.fromSeed(key);
    return naclKeypair;
}
exports.deriveEd25519 = deriveEd25519;
function deriveSpendingKey(mnemonic, networkType) {
    const path = network_type_1.NetworkType.privateDerivationPath(networkType);
    const sk = (0, hdwallet_babyjub_1.Privkey)(mnemonic, path).k;
    return sk;
}
exports.deriveSpendingKey = deriveSpendingKey;
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
const HEX_TABLE = [];
for (let n = 0; n <= 0xff; ++n) {
    const octet = n.toString(16).padStart(2, '0');
    HEX_TABLE.push(octet);
}
function bufToHex(buffer) {
    const octets = new Array(buffer.length);
    for (let i = 0; i < buffer.length; ++i)
        octets[i] = (HEX_TABLE[buffer[i]]);
    return octets.join('');
}
exports.bufToHex = bufToHex;
function base64ToHex(data) {
    const bytes = atob(data);
    const octets = new Array(bytes.length);
    for (let i = 0; i < bytes.length; ++i) {
        octets[i] = HEX_TABLE[bytes.charCodeAt(i)];
    }
    return octets.join('');
}
exports.base64ToHex = base64ToHex;
function hexToBuf(hex) {
    if (hex.length % 2 !== 0) {
        throw new Error('Invalid hex string');
    }
    if (hex.startsWith('0x')) {
        hex = hex.slice(2);
    }
    const buffer = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i = i + 2) {
        buffer[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return buffer;
}
exports.hexToBuf = hexToBuf;
class HexStringWriter {
    constructor() {
        this.buf = '0x';
    }
    toString() {
        return this.buf;
    }
    writeHex(hex) {
        this.buf += hex;
    }
    writeBigInt(num, numBytes) {
        this.buf += toTwosComplementHex(num, numBytes);
    }
    writeBigIntArray(nums, numBytes) {
        for (let num of nums) {
            this.writeBigInt(num, numBytes);
        }
    }
    writeNumber(num, numBytes) {
        this.buf += (0, web3_utils_1.padLeft)((0, web3_utils_1.numberToHex)(num).slice(2), numBytes * 2);
    }
}
exports.HexStringWriter = HexStringWriter;
class HexStringReader {
    constructor(data) {
        if (data.slice(0, 2) == '0x') {
            data = data.slice(2);
        }
        this.data = data;
        this.curIndex = 0;
    }
    readHex(numBytes) {
        const sliceEnd = this.curIndex + numBytes * 2;
        if (sliceEnd > this.data.length) {
            return null;
        }
        const res = this.data.slice(this.curIndex, sliceEnd);
        this.curIndex = sliceEnd;
        return res;
    }
    readNumber(numBytes, le = false) {
        let hex = this.readHex(numBytes);
        if (!hex)
            return null;
        if (le) {
            hex = hex.match(/../g).reverse().join('');
        }
        return parseInt(hex, 16);
    }
    readBigInt(numBytes, le = false) {
        let hex = this.readHex(numBytes);
        if (!hex)
            return null;
        if (le) {
            hex = hex.match(/../g).reverse().join('');
        }
        return BigInt('0x' + hex);
    }
    readBigIntArray(numElements, numBytesPerElement, le = false) {
        const elements = [];
        for (let i = 0; i < numElements; ++i) {
            const num = this.readBigInt(numBytesPerElement, le);
            if (!num) {
                break;
            }
            elements.push(num);
        }
        return elements;
    }
}
exports.HexStringReader = HexStringReader;
function toTwosComplementHex(num, numBytes) {
    let hex;
    if (num < 0) {
        let val = BigInt(2) ** BigInt(numBytes * 8) + num;
        hex = val.toString(16);
    }
    else {
        hex = num.toString(16);
    }
    return (0, web3_utils_1.padLeft)(hex, numBytes * 2);
}
exports.toTwosComplementHex = toTwosComplementHex;
//# sourceMappingURL=utils.js.map