// Based on https://github.com/near/near-seed-phrase/blob/master/index.js

import { SignKeyPair, sign } from 'tweetnacl';
import { derivePath } from 'near-hd-key';
import bip39 from 'bip39-light';
import { CoinType } from '@trustwallet/wallet-core';

export { SignKeyPair };

export function parseSeedPhrase(phrase: string, coin: CoinType, account: number): SignKeyPair {
  const words = phrase
    .trim()
    .split(/\s+/)
    .map(part => part.toLowerCase());

  const fullMnemonic = words.join(' ');

  // validate mnemonic
  bip39.mnemonicToEntropy(fullMnemonic);

  const path = CoinType.derivationPath(coin);

  const seed = bip39.mnemonicToSeed(fullMnemonic);
  const { key } = derivePath(path, seed.toString('hex'));
  const keyPair = sign.keyPair.fromSeed(key);

  return keyPair;
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic();
}
