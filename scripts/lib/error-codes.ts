// SPDX-License-Identifier: BUSL-1.1

import { Simnet } from '@hirosystems/clarinet-sdk';
import { readFileSync, writeFileSync } from 'fs';
const readmeFile = './README.md';

const constantErrRegex = /^\s*\(define-constant\s+(err-.+?)\s+(\(.+?\))\s*\)(.*?)$/gm;
const errorCodeRegex = /u([0-9]+)/;
const commentRegex = /;;\s*(.+)/;
const readmeErrorsDelineator = '<!--errors-->';

const tableHeader = ['Contract', 'Constant', 'Value', 'Description'];

export function isTestContract(contractName: string) {
  return contractName.indexOf('mock') >= 0;
}

function padTableCell(content: string, length: number) {
  const repeat = length - content.length + 1;
  return repeat > 0 ? ' ' + content + ' '.repeat(repeat) : ' ';
}

export function createErrorsTable(simnet: Simnet, extractCheck: boolean) {
  const errorsSeenCount: { [key: string]: { lastConstantName: string; count: number } } = {};
  let readme = readFileSync(readmeFile).toString();
  const errorTable: Array<Array<string>> = [];
  const longestColumnCells = tableHeader.map(v => v.length);

  const compareReadme = extractCheck && readme;

  for (const [contractId, abi] of simnet.getContractsInterfaces()) {
    if (isTestContract(contractId)) continue;
    console.log(abi);
    const source = simnet.getContractSource(contractId);
    if (!source) continue;
    const errorConstants = source.matchAll(constantErrRegex);
    for (const [, errorConstant, errorValue, errorComment] of errorConstants) {
      const errorDescription = errorComment?.match(commentRegex)?.[1] || ''; // || '_None_';
      if (!errorValue.match(errorCodeRegex))
        console.error(`Constant '${errorConstant}' error value is not in form of (err uint)`);
      if (!errorsSeenCount[errorValue])
        errorsSeenCount[errorValue] = { lastConstantName: errorConstant, count: 1 };
      else if (errorsSeenCount[errorValue].lastConstantName !== errorConstant) {
        errorsSeenCount[errorValue].lastConstantName = errorConstant;
        ++errorsSeenCount[errorValue].count;
      }
      const row = [contractId.split('.')[1], errorConstant, errorValue, errorDescription];
      row.map((content, index) => {
        if (content.length > longestColumnCells[index]) longestColumnCells[index] = content.length;
      });
      errorTable.push(row);
    }
  }

  const nonUniqueErrors = Object.entries(errorsSeenCount).filter(([, value]) => value.count > 1);
  if (nonUniqueErrors.length > 0) console.log(nonUniqueErrors);

  errorTable.sort((a, b) => (a[2] === b[2] ? (a[0] > b[0] ? 1 : -1) : a[2] > b[2] ? 1 : -1)); // string sort

  let errors =
    '|' +
    tableHeader
      .map((content, index) => padTableCell(content, longestColumnCells[index]))
      .join('|') +
    '|\n';
  errors += '|' + longestColumnCells.map(length => '-'.repeat(length + 2)).join('|') + '|\n';
  errors += errorTable.reduce(
    (accumulator, row) =>
      accumulator +
      '|' +
      row.map((content, index) => padTableCell(content, longestColumnCells[index])).join('|') +
      '|\n',
    ''
  );

  const split = readme.split(readmeErrorsDelineator);
  readme = `${split[0]}${readmeErrorsDelineator}\n${errors}${readmeErrorsDelineator}${split[2]}`;

  if (compareReadme && compareReadme !== readme) {
    throw new Error(
      'Generated readme is not equal to readme in current commit (error table mismatch)'
    );
  }

  writeFileSync(readmeFile, readme);
  console.log(`Error table written to ${readmeFile}`);
}
