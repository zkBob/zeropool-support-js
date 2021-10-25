import bip39 from 'bip39-light';
import * as HDKey from 'hdkey';
import { derivePath } from 'ed25519-hd-key';
import { sign } from 'tweetnacl';
import { numberToHex, padLeft } from 'web3-utils';
export { HDKey as Secp256k1HDKey };
export function preprocessMnemonic(mnemonic) {
    return mnemonic
        .trim()
        .split(/\s+/)
        .map(part => part.toLowerCase())
        .join(' ');
}
export function generateMnemonic() {
    return bip39.generateMnemonic();
}
export function deriveEd25519(path, mnemonic) {
    const processed = preprocessMnemonic(mnemonic);
    const seed = bip39.mnemonicToSeed(processed);
    const { key } = derivePath(path, seed.toString('hex'));
    const naclKeypair = sign.keyPair.fromSeed(key);
    return naclKeypair;
}
export function validateMnemonic(mnemonic) {
    try {
        bip39.mnemonicToEntropy(mnemonic);
        return true;
    }
    catch (e) {
        return false;
    }
}
const HEX_TABLE = [];
for (let n = 0; n <= 0xff; ++n) {
    const octet = n.toString(16).padStart(2, '0');
    HEX_TABLE.push(octet);
}
export function bufToHex(buffer) {
    const octets = new Array(buffer.length);
    for (let i = 0; i < buffer.length; ++i)
        octets[i] = (HEX_TABLE[buffer[i]]);
    return octets.join('');
}
export function base64ToHex(data) {
    const bytes = atob(data);
    const octets = new Array(bytes.length);
    for (let i = 0; i < bytes.length; ++i) {
        octets[i] = HEX_TABLE[bytes.charCodeAt(i)];
    }
    return octets.join('');
}
export function hexToBuf(hex) {
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
export class HexStringWriter {
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
        this.buf += padLeft(numberToHex(num).slice(2), numBytes * 2);
    }
}
export class HexStringReader {
    constructor(data) {
        if (data.slice(0, 2) == '0x') {
            data = data.slice(2);
        }
        this.data = data;
        this.curIndex = 0;
    }
    readHex(numBytes) {
        const sliceEnd = this.curIndex + numBytes * 2;
        const res = this.data.slice(this.curIndex, sliceEnd);
        this.curIndex = sliceEnd;
        return res;
    }
    readNumber(numBytes) {
        const hex = this.readHex(numBytes);
        return parseInt(hex, 16);
    }
    readBigInt(numBytes) {
        const hex = this.readHex(numBytes);
        return BigInt('0x' + hex);
    }
    readBigIntArray(numElements, numBytesPerElement) {
        return [...Array(numElements)]
            .map(() => this.readBigInt(numBytesPerElement));
    }
}
export function toTwosComplementHex(num, numBytes) {
    let hex;
    if (num < 0) {
        let val = BigInt(2) ** BigInt(numBytes * 8) + num;
        hex = val.toString(16);
    }
    else {
        hex = num.toString(16);
    }
    return padLeft(hex, numBytes * 2);
}
//# sourceMappingURL=utils.js.map