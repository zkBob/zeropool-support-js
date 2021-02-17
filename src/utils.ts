import bip39 from 'bip39-light';
import * as HDKey from 'hdkey';

import { CoinType } from './coins/coin-type';

export { HDKey };

export function preprocessMnemonic(mnemonic: string): string {
  return mnemonic
    .trim()
    .split(/\s+/)
    .map(part => part.toLowerCase())
    .join(' ');
}

// TODO: Utilize bip32 hierarchy instead of calling this method each time a private key is needed.
export function parseMnemonic(mnemonic: string, coin: CoinType, accountIdx: number): HDKey {
  const processed = preprocessMnemonic(mnemonic);

  // validate mnemonic
  bip39.mnemonicToEntropy(processed);

  const path = CoinType.derivationPath(coin, accountIdx);
  const seed = bip39.mnemonicToSeed(processed);

  const hdkey = HDKey.fromMasterSeed(seed);
  const child = hdkey.derive(path);

  return child;
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic();
}

export function validateMnemonic(mnemonic: string): boolean {
  try {
    bip39.mnemonicToEntropy(mnemonic);
    return true;
  } catch (e) {
    return false;
  }
}
