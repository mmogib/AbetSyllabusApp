import { createEmptyDraft } from '../schema/defaultDraft';
import {
  catalogDescriptionRule,
  corequisitesRule,
  courseNumberRule,
  courseTitleRule,
  creditsRule,
  departmentRule,
  instructorRule,
  prerequisitesRule,
  supplementalMaterialsRule,
  textbookRule,
} from './rules';
import type {
  CreditsCategorization,
  LearningOutcome,
  SyllabusDraft,
  Topic,
} from '../../types/schema';

const SIMPLE_SECTION_STOP_PATTERNS = [
  /^[A-Z]\.\s+/,
  /^\d+\.\s+/,
];
const GENERIC_SECTION_STOP_PATTERNS = [
  /^[A-Z]\s*\.\s+/,
  /^\d+\s*\.\s+/,
];
const CREDIT_SECTION_STOP_PATTERNS = [
  ...GENERIC_SECTION_STOP_PATTERNS,
  /^Area Credit Hours\b/i,
  /^Subject Area Credit Hours\b/i,
];
const FIELD_LABEL_STOP_PATTERNS = [
  ...SIMPLE_SECTION_STOP_PATTERNS,
  /^(?:Course Title|Course Code|Department|Course Instructor\/Coordinator)\b/i,
];

const CLO_SECTION_STOP_PATTERNS = [
  /^[C-Z]\.\s+/,
  /^F\./i,
];

const TOPIC_SECTION_STOP_PATTERNS = [
  /^[D-Z]\.\s+/,
  /^F\./i,
  /^1\.\s+(?:Required Textbooks|List Required Textbooks)\b/i,
];
const SUPPLEMENTAL_SECTION_STOP_PATTERNS = [
  ...SIMPLE_SECTION_STOP_PATTERNS,
  /^Educational and Research Facilities and Equipment$/i,
  /^Course Evaluation$/i,
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function prepareText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeValue(value: string): string {
  return normalizeLine(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/([A-Za-z])-\s+([a-z])/g, '$1-$2')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function sanitizeFieldValue(label: string, value: string): string {
  if (label.toLowerCase().startsWith('course instructor')) {
    return normalizeValue(value.replace(/\s+Signature:.*$/i, ''));
  }

  return normalizeValue(value);
}

function getLines(text: string): string[] {
  return prepareText(text)
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean);
}

function stripBulletPrefix(value: string): string {
  return value.replace(/^(?:[•â€¢\-]|)\s*/, '').trim();
}

function isRejectedFieldValue(label: string, value: string): boolean {
  const normalizedLabel = label.toLowerCase();
  const normalizedValue = value.toLowerCase();

  if (normalizedLabel === 'course title' && normalizedValue === 'clo mapping') {
    return true;
  }

  if (normalizedLabel === 'department' && normalizedValue === 'mission') {
    return true;
  }

  return false;
}

function buildInlineLabelPattern(label: string): RegExp {
  return new RegExp(
    `^(?:\\d+\\.\\s*)?${escapeRegex(label)}(?:\\s*\\([^)]*\\))?(?::)?(?:\\s+(?<value>.+))?$`,
    'i',
  );
}

function extractSingleLineValue(lines: readonly string[], labels: readonly string[]): string {
  for (const line of lines) {
    for (const label of labels) {
      const match = line.match(buildInlineLabelPattern(label));
      const value = sanitizeFieldValue(label, match?.groups?.value ?? '');

      if (value && !isRejectedFieldValue(label, value)) {
        return value;
      }
    }
  }

  return '';
}

function matchesStopPattern(line: string, stopPatterns: readonly RegExp[]): boolean {
  return stopPatterns.some((pattern) => pattern.test(line));
}

function extractSectionValue(
  lines: readonly string[],
  labels: readonly string[],
  stopPatterns: readonly RegExp[],
): string {
  for (let index = 0; index < lines.length; index += 1) {
    for (const label of labels) {
      const match = lines[index]?.match(buildInlineLabelPattern(label));
      if (!match) {
        continue;
      }

      const collectedLines: string[] = [];
      const inlineValue = sanitizeFieldValue(label, match.groups?.value ?? '');
      if (inlineValue) {
        collectedLines.push(stripBulletPrefix(inlineValue));
      }

      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const nextLine = lines[cursor];

        if (matchesStopPattern(nextLine, stopPatterns)) {
          break;
        }

        if (
          /:$/.test(nextLine) &&
          cursor + 1 < lines.length &&
          matchesStopPattern(lines[cursor + 1], FIELD_LABEL_STOP_PATTERNS)
        ) {
          break;
        }

        collectedLines.push(stripBulletPrefix(nextLine));
      }

      const value = normalizeValue(collectedLines.join(' '));
      if (value && !isRejectedFieldValue(label, value)) {
        return value;
      }
    }
  }

  return '';
}

function extractCombinedSectionValue(
  lines: readonly string[],
  labels: readonly string[],
  stopPatterns: readonly RegExp[],
): string {
  const sections = labels
    .map((label) => extractSectionValue(lines, [label], stopPatterns))
    .filter((section) => section !== '' && !/^na$/i.test(section) && !/^none$/i.test(section));

  return normalizeValue(sections.join(' ; '));
}

function normalizeSupplementalSection(section: string): string {
  return normalizeValue(
    section.replace(
      /^such as computer-based software, professional standards or regulations and software\.\s*/i,
      '',
    ),
  );
}

function extractSupplementalMaterials(lines: readonly string[]): string {
  const sections = supplementalMaterialsRule.labels
    .map((label) => extractSectionValue(lines, [label], SUPPLEMENTAL_SECTION_STOP_PATTERNS))
    .map(normalizeSupplementalSection)
    .filter((section) => section !== '' && !/^na$/i.test(section) && !/^none$/i.test(section))
    .filter((section, index, values) => values.indexOf(section) === index);

  return normalizeValue(sections.join(' ; '));
}

function extractAreaCreditHoursSection(lines: readonly string[]): string {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^(?:\d+\s*\.\s*)?(?:Subject Area Credit Hours|Area Credit Hours)\b/i.test(line)) {
      continue;
    }

    const collected: string[] = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextLine = lines[cursor];
      if (matchesStopPattern(nextLine, GENERIC_SECTION_STOP_PATTERNS)) {
        break;
      }

      collected.push(nextLine);
    }

    return normalizeValue(collected.join(' '));
  }

  return '';
}

function parseDelimitedCells(line: string): string[] {
  if (!line.includes('|||')) {
    return [];
  }

  return line.split(/\s*\|\|\|\s*/).map((cell) => normalizeValue(cell));
}

function isCreditsCategoryLabel(value: string): boolean {
  return (
    /engineering\s*\/\s*computer\s*science/i.test(value) ||
    /mathematics\s*\/\s*science/i.test(value) ||
    /^business$/i.test(value) ||
    /general education/i.test(value) ||
    /^other$/i.test(value)
  );
}

function extractDelimitedCreditsCategorization(lines: readonly string[]): CreditsCategorization | null {
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^(?:\d+\s*\.\s*)?(?:Subject Area Credit Hours|Area Credit Hours)\b/i.test(lines[index])) {
      continue;
    }

    for (let cursor = index + 1; cursor < Math.min(lines.length, index + 8); cursor += 1) {
      const labelCells = parseDelimitedCells(lines[cursor]);
      if (labelCells.length < 5 || !labelCells.some(isCreditsCategoryLabel)) {
        continue;
      }

      let valueCells: string[] = [];
      for (
        let valueCursor = cursor + 1;
        valueCursor < Math.min(lines.length, cursor + 7);
        valueCursor += 1
      ) {
        valueCells = parseDelimitedCells(lines[valueCursor]);
        if (valueCells.length >= labelCells.length) {
          break;
        }
      }

      if (valueCells.length < labelCells.length) {
        continue;
      }

      const totals = createEmptyCreditsCategorization();
      let hasAnyValue = false;

      for (let cellIndex = 0; cellIndex < Math.min(labelCells.length, valueCells.length); cellIndex += 1) {
        const label = labelCells[cellIndex];
        const value = valueCells[cellIndex];

        if (!/^\d+(?:\.\d+)?$/.test(value)) {
          continue;
        }

        hasAnyValue = true;

        if (/engineering\s*\/\s*computer\s*science/i.test(label)) {
          totals.engineeringTopics = value;
        } else if (/mathematics\s*\/\s*science/i.test(label)) {
          totals.mathAndBasicSciences = value;
        } else if (
          /^business$/i.test(label) ||
          /general education/i.test(label) ||
          /^other$/i.test(label)
        ) {
          totals.other = formatCreditValue(
            (totals.other ? Number.parseFloat(totals.other) : 0) + Number.parseFloat(value),
          );
        }
      }

      return finalizeCreditsCategorization(totals, hasAnyValue);
    }
  }

  return null;
}

function createEmptyCreditsCategorization(): CreditsCategorization {
  return {
    mathAndBasicSciences: '',
    engineeringTopics: '',
    other: '',
  };
}

function formatCreditValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function finalizeCreditsCategorization(
  value: CreditsCategorization,
  hasAnyValue: boolean,
): CreditsCategorization {
  if (!hasAnyValue) {
    return createEmptyCreditsCategorization();
  }

  return {
    mathAndBasicSciences: value.mathAndBasicSciences || '0',
    engineeringTopics: value.engineeringTopics || '0',
    other: value.other || '0',
  };
}

function extractCreditsCategorization(lines: readonly string[]): CreditsCategorization {
  const delimitedValues = extractDelimitedCreditsCategorization(lines);
  if (delimitedValues) {
    return delimitedValues;
  }

  const section = extractAreaCreditHoursSection(lines);
  if (!section) {
    return createEmptyCreditsCategorization();
  }

  const normalizedSection = section
    .replace(/Engineering\s*\/\s*Computer\s*Science/gi, ' __ENG__ ')
    .replace(/Mathematics\s*\/\s*Science/gi, ' __MATH__ ')
    .replace(/General Education\s*\/\s*Social Sciences\s*\/\s*Humanities/gi, ' __OTHER__ ')
    .replace(/Other Subject Areas/gi, ' __OTHER__ ')
    .replace(/General Education/gi, ' __OTHER__ ')
    .replace(/Social Sciences/gi, ' __OTHER__ ')
    .replace(/Humanities/gi, ' __OTHER__ ')
    .replace(/\bBusiness\b/gi, ' __OTHER__ ')
    .replace(/\bOther\b/gi, ' __OTHER__ ');

  const categories = normalizedSection.match(/__(?:ENG|MATH|OTHER)__/g) ?? [];
  const values = (normalizedSection.match(/\b\d+(?:\.\d+)?\b/g) ?? []).map((value) =>
    Number.parseFloat(value),
  );
  if (categories.length === 0 || values.length === 0) {
    return createEmptyCreditsCategorization();
  }

  const totals = {
    engineeringTopics: 0,
    mathAndBasicSciences: 0,
    other: 0,
  };

  for (let index = 0; index < Math.min(categories.length, values.length); index += 1) {
    const value = values[index];
    if (!Number.isFinite(value)) {
      continue;
    }

    if (categories[index] === '__ENG__') {
      totals.engineeringTopics += value;
    } else if (categories[index] === '__MATH__') {
      totals.mathAndBasicSciences += value;
    } else {
      totals.other += value;
    }
  }

  return finalizeCreditsCategorization({
    mathAndBasicSciences: formatCreditValue(totals.mathAndBasicSciences),
    engineeringTopics: formatCreditValue(totals.engineeringTopics),
    other: formatCreditValue(totals.other),
  }, totals.mathAndBasicSciences > 0 || totals.engineeringTopics > 0 || totals.other > 0);
}

function isOutcomeSectionHeading(line: string, nextLine = ''): boolean {
  const combined = normalizeValue(`${line} ${nextLine}`);
  return /learning outcomes/i.test(combined) && /(plo|program-level)/i.test(combined);
}

function isOutcomeCode(line: string): boolean {
  return /^\d+\.\d+$/.test(line);
}

function isSyntheticDelimitedRow(line: string): boolean {
  return line.includes('|||');
}

function parseOutcomeLine(
  line: string,
): { outcomeCode: string; inlineDescription: string } | null {
  if (isSyntheticDelimitedRow(line)) {
    return null;
  }

  const exactCode = line.match(/^(?<code>\d+\.\d+)$/);
  if (exactCode?.groups) {
    return {
      outcomeCode: exactCode.groups.code,
      inlineDescription: '',
    };
  }

  const inlineCode = line.match(/^(?<code>\d+\.\d+)\s+(?<description>.+)$/);
  if (inlineCode?.groups) {
    return {
      outcomeCode: inlineCode.groups.code,
      inlineDescription: inlineCode.groups.description,
    };
  }

  return null;
}

function isOutcomeNoise(line: string): boolean {
  return (
    /^(?:Code|CLOs|CLO|Aligned PLOs|\(PLO.?s Code\)|Teaching Strategies|Assessment Methods)$/i.test(
      line,
    ) ||
    /^\*?\s*Mapping Rules\b/i.test(line) ||
    /^(?:Knowledge and Understanding|Skills|Values|Values, autonomy, and responsibility)$/i.test(
      line,
    ) ||
    /^\d+\s+(?:Knowledge and Understanding|Skills|Values|Values, autonomy, and responsibility)$/i.test(
      line,
    ) ||
    /^\d+$/.test(line) ||
    /^\d+\.$/.test(line) ||
    /^(?:K|S|V)\s*\.?\s*\d+(?:\b|$)/i.test(line) ||
    /^(?:Lecture|Lectures|Homework|Exams?|Quizzes?|Assignments?|Project(?: Report)?|Class Discussion|Participating|Peer evaluations|Teamwork|Presentation|Report)\b/i.test(
      line,
    )
  );
}

function extractLearningOutcomes(lines: readonly string[]): LearningOutcome[] {
  const sectionStart = lines.findIndex((line, index) =>
    isOutcomeSectionHeading(line, lines[index + 1] ?? ''),
  );
  if (sectionStart === -1) {
    return [];
  }

  const outcomes: LearningOutcome[] = [];

  for (let index = sectionStart + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (matchesStopPattern(line, CLO_SECTION_STOP_PATTERNS)) {
      break;
    }

     if (isSyntheticDelimitedRow(line)) {
      continue;
    }

    const outcomeLine = parseOutcomeLine(line);
    if (!outcomeLine) {
      continue;
    }

    const descriptionLines: string[] = outcomeLine.inlineDescription
      ? [outcomeLine.inlineDescription]
      : [];

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextLine = lines[cursor];

      if (
        parseOutcomeLine(nextLine) ||
        isSyntheticDelimitedRow(nextLine) ||
        matchesStopPattern(nextLine, CLO_SECTION_STOP_PATTERNS) ||
        isOutcomeNoise(nextLine)
      ) {
        index = cursor - 1;
        break;
      }

      descriptionLines.push(nextLine);
      index = cursor;
    }

    const description = normalizeValue(descriptionLines.join(' '));
    if (description) {
      outcomes.push({
        outcomeCode: outcomeLine.outcomeCode,
        clo: description,
      });
    }
  }

  return outcomes;
}

function isTopicSectionHeading(line: string): boolean {
  return /topics to be covered/i.test(line);
}

function isTopicNoise(line: string): boolean {
  return (
    /^(?:No|List of Topics|Topic|Contact Hours|Contact hours|Hours|Contact|Total)$/i.test(
      line,
    ) ||
    isSyntheticDelimitedRow(line)
  );
}

function isTopicDuration(line: string): boolean {
  return /^\d+(?:\.\d+)?(?:\s*(?:hours?|weeks?|week))?$/i.test(line);
}

function isSameLineTopic(line: string): boolean {
  return /^\d+\s+.+?\s+\d+(?:\.\d+)?$/i.test(line);
}

function extractTopics(lines: readonly string[]): Topic[] {
  const sectionStart = lines.findIndex(isTopicSectionHeading);
  if (sectionStart === -1) {
    return [];
  }

  const topics: Topic[] = [];

  for (let index = sectionStart + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (matchesStopPattern(line, TOPIC_SECTION_STOP_PATTERNS)) {
      break;
    }

    if (isTopicNoise(line)) {
      continue;
    }

    const sameLineMatch = line.match(/^\d+\s+(?<title>.+?)\s+(?<duration>\d+(?:\.\d+)?)$/);
    if (sameLineMatch?.groups) {
      const titleLines = [sameLineMatch.groups.title];

      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const nextLine = lines[cursor];

        if (
          matchesStopPattern(nextLine, TOPIC_SECTION_STOP_PATTERNS) ||
          isTopicNoise(nextLine) ||
          /^\d+$/.test(nextLine) ||
          isSameLineTopic(nextLine) ||
          isTopicDuration(nextLine)
        ) {
          index = cursor - 1;
          break;
        }

        titleLines.push(nextLine);
        index = cursor;
      }

      topics.push({
        title: normalizeValue(titleLines.join(' ')),
        durationText: normalizeValue(sameLineMatch.groups.duration),
      });
      continue;
    }

    if (!/^\d+$/.test(line)) {
      continue;
    }

    const titleLines: string[] = [];
    let durationText = '';

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextLine = lines[cursor];

      if (matchesStopPattern(nextLine, TOPIC_SECTION_STOP_PATTERNS)) {
        index = cursor - 1;
        break;
      }

      if (isTopicNoise(nextLine)) {
        continue;
      }

      if (isTopicDuration(nextLine)) {
        durationText = normalizeValue(nextLine);
        index = cursor;
        break;
      }

      if (/^\d+$/.test(nextLine) && titleLines.length === 0) {
        index = cursor - 1;
        break;
      }

      titleLines.push(nextLine);
      index = cursor;
    }

    const title = normalizeValue(titleLines.join(' '));
    if (title && durationText) {
      topics.push({
        title,
        durationText,
      });
    }
  }

  return topics;
}

function extractDesignation(lines: readonly string[]): string {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!/^2\.\s+Course Type:?$/i.test(line)) {
      continue;
    }

    const collected: string[] = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextLine = lines[cursor];

      if (matchesStopPattern(nextLine, SIMPLE_SECTION_STOP_PATTERNS)) {
        break;
      }

      collected.push(nextLine);
    }

    return normalizeValue(collected.join(' '));
  }

  return '';
}

export function parseCourseSpec(text: string): SyllabusDraft {
  const draft = createEmptyDraft();
  const lines = getLines(text);

  draft.courseIdentity.courseTitle = extractSingleLineValue(lines, courseTitleRule.labels);
  draft.courseIdentity.courseNumber = extractSingleLineValue(lines, courseNumberRule.labels);
  draft.courseIdentity.department = extractSingleLineValue(lines, departmentRule.labels);
  draft.courseIdentity.instructorName = extractSingleLineValue(lines, instructorRule.labels);
  draft.courseIdentity.creditsText = extractSectionValue(
    lines,
    creditsRule.labels,
    CREDIT_SECTION_STOP_PATTERNS,
  );
  draft.courseIdentity.creditsCategorization = extractCreditsCategorization(lines);
  draft.courseInformation.catalogDescription = extractSectionValue(
    lines,
    catalogDescriptionRule.labels,
    FIELD_LABEL_STOP_PATTERNS,
  );
  draft.courseInformation.prerequisites = extractSectionValue(
    lines,
    prerequisitesRule.labels,
    SIMPLE_SECTION_STOP_PATTERNS,
  );
  draft.courseInformation.corequisites = extractSectionValue(
    lines,
    corequisitesRule.labels,
    SIMPLE_SECTION_STOP_PATTERNS,
  );
  draft.courseInformation.designation = extractDesignation(lines);
  draft.materials.textbook = extractSectionValue(
    lines,
    textbookRule.labels,
    SIMPLE_SECTION_STOP_PATTERNS,
  );
  draft.materials.supplementalMaterials = extractSupplementalMaterials(lines);
  draft.learningOutcomes = extractLearningOutcomes(lines);
  draft.topics = extractTopics(lines);

  return draft;
}
