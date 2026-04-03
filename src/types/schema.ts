export type FieldStatus = 'resolved' | 'missing' | 'needs_review';
export type FieldSource = 'deterministic' | 'llm' | 'user';
export type FieldConfidence = 'high' | 'medium' | 'low';

export type FieldPath =
  | 'courseIdentity.department'
  | 'courseIdentity.courseNumber'
  | 'courseIdentity.courseTitle'
  | 'courseIdentity.instructorName'
  | 'courseIdentity.creditsText'
  | 'materials.textbook'
  | 'materials.supplementalMaterials'
  | 'courseInformation.catalogDescription'
  | 'courseInformation.prerequisites'
  | 'courseInformation.designation';

export interface FieldMeta {
  status: FieldStatus;
  source?: FieldSource;
  confidence?: FieldConfidence;
  evidence?: string;
}

export interface CourseIdentity {
  department: string;
  courseNumber: string;
  courseTitle: string;
  instructorName: string;
  creditsText: string;
}

export interface Materials {
  textbook: string;
  supplementalMaterials: string;
}

export interface CourseInformation {
  catalogDescription: string;
  prerequisites: string;
  designation: string;
}

export interface LearningOutcome {
  clo: string;
  outcomeCode: string;
}

export interface Topic {
  title: string;
  durationText: string;
}

export interface GenerationMetadata {
  templateVersion: string;
  termCode: string;
  generatedAt?: string;
}

export interface SyllabusDraft {
  courseIdentity: CourseIdentity;
  materials: Materials;
  courseInformation: CourseInformation;
  learningOutcomes: LearningOutcome[];
  topics: Topic[];
  reviewMetadata: Partial<Record<FieldPath, FieldMeta>>;
  generationMetadata: GenerationMetadata;
}
