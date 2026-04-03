import type { FieldPath } from '../../types/schema';

export const requiredFieldPaths = [
  'courseIdentity.department',
  'courseIdentity.courseNumber',
  'courseIdentity.courseTitle',
  'courseIdentity.instructorName',
  'courseInformation.catalogDescription',
  'courseInformation.prerequisites',
  'materials.textbook',
] as const satisfies readonly FieldPath[];

export type RequiredFieldPath = (typeof requiredFieldPaths)[number];
