// Based on https://github.com/near/near-seed-phrase/blob/master/index.js

import { SignKeyPair, sign, secretbox } from 'tweetnacl';
import { derivePath } from 'near-hd-key';
import bip39 from 'bip39-light';
import bs58 from 'bs58';

const KEY_DERIVATION_PATH = "m/44'/397'/0'"

export interface EncodedKeyPair {
    publicKey: string,
    secretKey: string,
}

export class SeedPhrase {
    private phrase: string;
    private seed: Buffer;

    constructor(phrase: string) {
        this.phrase = phrase;
        this.seed = bip39.mnemonicToSeed(normalizeSeedPhrase(phrase));
    }

    genKeyPair(path?: string): SignKeyPair {
        const { key } = derivePath(path || KEY_DERIVATION_PATH, this.seed.toString('hex'));
        const keyPair = sign.keyPair.fromSeed(key);

        return keyPair;
    }

    genKeyPairEncoded(path?: string): EncodedKeyPair {
        const pair = this.genKeyPair(path);
        const publicKey = 'ed25519:' + bs58.encode(Buffer.from(pair.publicKey));
        const secretKey = 'ed25519:' + bs58.encode(Buffer.from(pair.secretKey));
        return { secretKey, publicKey };
    }
}

function normalizeSeedPhrase(seedPhrase) {
    return seedPhrase.trim().split(/\s+/).map(part => part.toLowerCase()).join(' ');
}
