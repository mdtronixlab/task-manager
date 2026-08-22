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
