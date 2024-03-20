import { describe, it } from 'vitest';
import { createErrorsTable } from '../scripts/lib/error-codes.ts';

describe('readme', () => {
  it('should have the correct error code table', () => {
    createErrorsTable(simnet, true);
    // should not throw an error
  });
});
