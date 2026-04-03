export type BatchFileStatus = 'success' | 'needs_review' | 'failed';

export interface BatchRecord {
  sourceFile: string;
  relativeSourcePath: string;
  status: BatchFileStatus;
  termCode: string;
  courseNumber: string;
  courseTitle: string;
  outputFile: string;
  unresolvedFieldCount: number;
  unresolvedFields: string[];
  extractedTextFile: string;
  errorMessage: string;
}

export interface BatchSummary {
  totalDiscovered: number;
  processed: number;
  success: number;
  needsReview: number;
  failed: number;
}

export interface BatchOptions {
  inputDir: string;
  outputDir: string;
  termCode?: string;
  recursive: boolean;
  copyReviewSources: boolean;
  writeExtractedText: boolean;
  now?: Date;
}
