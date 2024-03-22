// SPDX-License-Identifier: BUSL-1.1
import { initSimnet } from '@hirosystems/clarinet-sdk';
import { createErrorsTable } from './lib/error-codes.ts';
const manifestFile = './Clarinet.toml';
const simnet = await initSimnet(manifestFile);

createErrorsTable(simnet, false);
