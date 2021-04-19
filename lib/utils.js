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
//# sourceMappingURL=utils.js.map