// Generates stable, sequential, application-owned IDs (rules.md §17 —
// never use a database row number as an application ID). Backed by the
// `counters` table; the upsert + increment runs inside a transaction so two
// concurrent requests can never be handed the same ID.

import { prisma } from '../db.js';
import { ID_PREFIX } from '../config.js';

/**
 * @param {string} prefix e.g. ID_PREFIX.TASK
 * @param {string} counterName e.g. "TASK"
 * @return {Promise<string>} e.g. "TSK_000001"
 */
async function generateId(prefix, counterName) {
  const counter = await prisma.$transaction(async (tx) => {
    const existing = await tx.counter.findUnique({ where: { name: counterName } });
    if (existing) {
      return tx.counter.update({
        where: { name: counterName },
        data: { value: { increment: 1 } },
      });
    }
    return tx.counter.create({ data: { name: counterName, value: 1 } });
  });

  return `${prefix}_${String(counter.value).padStart(6, '0')}`;
}

export const generateUserId = () => generateId(ID_PREFIX.USER, 'USER');
export const generateTaskId = () => generateId(ID_PREFIX.TASK, 'TASK');
export const generateCategoryId = () => generateId(ID_PREFIX.CATEGORY, 'CATEGORY');
export const generateDepartmentId = () => generateId(ID_PREFIX.DEPARTMENT, 'DEPARTMENT');
export const generateLogId = () => generateId(ID_PREFIX.LOG, 'LOG');
