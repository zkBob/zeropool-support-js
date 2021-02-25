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
