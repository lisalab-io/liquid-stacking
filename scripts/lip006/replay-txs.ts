import fs from 'fs';
async function main() {
  let txs = JSON.parse(
    fs
      .readFileSync(
        './scripts/lip006/SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.lqstx-mint-endpoint-v2-01_transactions.json'
      )
      .toString()
  );
  console.log(txs.length);
  txs = txs.filter(t => t.tx.tx_status === 'success');
  console.log(txs.length);
  console.log(txs[0].tx.block_height);
  txs.reverse();
  console.log(txs[0].tx.block_height);
  txs.map(t => )
}

main();
