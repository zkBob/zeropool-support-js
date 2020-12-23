// Based on https://github.com/near/near-seed-phrase/blob/master/index.js

import { SignKeyPair, sign } from 'tweetnacl';
import { derivePath } from 'near-hd-key';
import bip39 from 'bip39-light';

const KEY_DERIVATION_PATH = "m/44'/397'/0'"

export interface FormattedKeyPair {
  publicKey: string,
  secretKey: string,
}

export function parseSeedPhrase(phrase: string, path?: string): SignKeyPair {
  const words = phrase
    .trim()
    .split(/\s+/)
    .map(part => part.toLowerCase());

  const fullMnemonic = words.join(' ');

  // validate mnemonic
  bip39.mnemonicToEntropy(fullMnemonic);

  const seed = bip39.mnemonicToSeed(fullMnemonic);
  const { key } = derivePath(path || KEY_DERIVATION_PATH, seed.toString('hex'));
  const keyPair = sign.keyPair.fromSeed(key);

  return keyPair;
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic();
}
