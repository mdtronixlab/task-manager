// Shared request-validation helpers. Every service validates its own input
// here rather than trusting the frontend (rules.md §27).

import { ValidationError } from './errors.js';

/**
 * @param {*} value
 * @param {string} fieldName
 * @param {number=} maxLength
 * @return {string} Trimmed value.
 */
export function requireString(value, fieldName, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw ValidationError(`${fieldName} is required.`);
  }
  const trimmed = value.trim();
  if (maxLength && trimmed.length > maxLength) {
    throw ValidationError(`${fieldName} must be ${maxLength} characters or fewer.`);
  }
  return trimmed;
}

/**
 * @param {*} value
 * @param {Record<string,string>} allowedValues e.g. TASK_STATUS
 * @param {string} fieldName
 * @return {string}
 */
export function requireEnum(value, allowedValues, fieldName) {
  const values = Object.values(allowedValues);
  if (!values.includes(value)) {
    throw ValidationError(`${fieldName} must be one of: ${values.join(', ')}.`);
  }
  return value;
}

const DUE_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validates an optional task due time ("HH:mm", 24h, org-local — matches
 * an <input type="time"> value). `null`/`''`/`undefined` all mean "no due
 * time" and pass through as `null` (clearing it on an edit).
 * @param {*} value
 * @return {string|null}
 */
export function requireDueTimeOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !DUE_TIME_PATTERN.test(value)) {
    throw ValidationError('Due time must be in HH:mm 24-hour format.');
  }
  return value;
}
