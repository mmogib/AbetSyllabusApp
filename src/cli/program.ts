import type { ProgramCode } from './batchTypes';

export function assertProgramCode(value: string | undefined): ProgramCode {
  if (value === 'MATH' || value === 'AS' || value === 'DATA') {
    return value;
  }

  throw new Error('Program must be one of: MATH, AS, DATA');
}
