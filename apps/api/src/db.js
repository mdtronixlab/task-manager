// Single Prisma client instance for the whole process (rules.md §34 — a
// central data-access layer rather than ad-hoc connections everywhere).

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
