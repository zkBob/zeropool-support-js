import { HDWallet, CoinType } from 'zeropool-api-js';
import { generateMnemonic } from 'zeropool-api-js/lib/utils';
import devConfig from 'zeropool-api-js/config.dev'; // you might prefer to use your own

async function example() {
  const mnemonic = generateMnemonic();
  const hdWallet = new HDWallet(mnemonic, [CoinType.near], devConfig);

  const near = hdWallet.getCoin(CoinType.near);
  let balance = await near.getBalance();

  console.log('Balance: ', balance);
  await near.transfer('some address', near.toBaseUnit('1'));

  balance = await near.getBalance();
  console.log('Balance: ', balance);
}
