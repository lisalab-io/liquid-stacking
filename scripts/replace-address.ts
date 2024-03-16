import { readdirSync, readFileSync, writeFileSync, lstatSync } from 'fs';

export function replaceAddress(mainnetToTestnet: boolean) {
  replaceInDir('./.cache', mainnetToTestnet);
  replaceInDir('./contracts', mainnetToTestnet);
}

function replaceInDir(path: string, mainnetToTestnet: boolean) {
  for (let filename of readdirSync(path)) {
    const file = `${path}/${filename}`;
    if (lstatSync(file).isDirectory()) {
      replaceInDir(file, mainnetToTestnet);
    } else {
      replaceAddressInFile(file, mainnetToTestnet);
    }
  }
}
function replaceAddressInFile(file: string, mainnetToTestnet: boolean) {
  const content = readFileSync(file).toString();
  const newContent = mainnetToTestnet
    ? content.replace(/SP000000000000000000002Q6VF78/g, 'ST000000000000000000002AMW42H')
    : content.replace(/ST000000000000000000002AMW42H/g, 'SP000000000000000000002Q6VF78');
  if (content !== newContent) {
    writeFileSync(file, newContent);
  }
}
