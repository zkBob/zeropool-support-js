import { Transaction as NativeTx } from 'web3-core';

import { Constants, getConstants } from '@/libzeropool-rs';
import { Transaction, TxStatus } from '../transaction';

// TODO: getConstants is unusable if the wasm module is not loaded yet.
export const CONSTANTS: Constants = {
  HEIGHT: 48,
  IN: 3,
  OUT: (1 << 7) - 1,
  OUTLOG: 7
};

export function convertTransaction(tx: NativeTx, timestamp: number, customStatus?: TxStatus): Transaction {
  return {
    status: customStatus || TxStatus.Completed,
    amount: tx.value,
    from: tx.from,
    to: tx.to || '',
    timestamp: timestamp,
    blockHash: tx.blockHash || '',
    hash: tx.hash,
  };
}

export function toCompactSignature(signature: string) {
  let v = signature.substr(130, 2);
  if (v == "1c") {
    return `${signature.slice(0, 66)}${(parseInt(signature[66], 16) | 8).toString(16)}${signature.slice(67, 130)}`;
  } else if (v != "1b") {
    throw ("invalid signature: v should be 27 or 28");
  }

  return signature;
}

export function toCanonicalSignature(signature: string) {
  let v = "1c";
  if (parseInt(signature[66], 16) > 7) {
    v = "1e";
  }
  return signature + v;
}
