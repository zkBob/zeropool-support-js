import bip39 from 'bip39-light';
import * as HDKey from 'hdkey';
import { derivePath } from 'ed25519-hd-key';
import { sign } from 'tweetnacl';
export { HDKey as Secp256k1HDKey };
export function preprocessMnemonic(mnemonic) {
    return mnemonic
        .trim()
        .split(/\s+/)
        .map(function (part) { return part.toLowerCase(); })
        .join(' ');
}
export function generateMnemonic() {
    return bip39.generateMnemonic();
}
export function deriveEd25519(path, mnemonic) {
    var processed = preprocessMnemonic(mnemonic);
    var seed = bip39.mnemonicToSeed(processed);
    var key = derivePath(path, seed.toString('hex')).key;
    var naclKeypair = sign.keyPair.fromSeed(key);
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
var HEX_TABLE = [];
for (var n = 0; n <= 0xff; ++n) {
    var octet = n.toString(16).padStart(2, '0');
    HEX_TABLE.push(octet);
}
export function bufToHex(buffer) {
    var octets = new Array(buffer.length);
    for (var i = 0; i < buffer.length; ++i)
        octets[i] = (HEX_TABLE[buffer[i]]);
    return octets.join('');
}
export function base64ToHex(data) {
    var bytes = atob(data);
    var octets = new Array(bytes.length);
    for (var i = 0; i < bytes.length; ++i) {
        octets[i] = HEX_TABLE[bytes.charCodeAt(i)];
    }
    return octets.join('');
}
export function hexToBuf(hex) {
    if (hex.length % 2 !== 0) {
        throw new Error('Invalid hex string');
    }
    var buffer = new Uint8Array(hex.length / 2);
    for (var i = 0; i < hex.length; i = i + 2) {
        buffer[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return buffer;
}
//# sourceMappingURL=utils.js.map