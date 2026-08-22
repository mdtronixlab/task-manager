// Run once after the first migration (`npm run db:seed` in apps/api).
// Idempotent — safe to re-run; it only fills in what's missing. Equivalent
// to the old Apps Script `initializeDatabase()`, minus sheet/header
// creation (Prisma migrations own the schema now).

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { generateUserId, generateCategoryId, generateDepartmentId } from '../src/lib/ids.js';

const prisma = new PrismaClient();

async function seedDefaultSettings() {
  const defaults = [
    { key: 'APPLICATION_NAME', value: 'Organisation Task Manager', description: 'Application display name' },
    { key: 'TIMEZONE', value: Intl.DateTimeFormat().resolvedOptions().timeZone, description: 'Organisation default timezone (IANA name)' },
  ];

  for (const setting of defaults) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
}

// A minimal starter set so the Phase 3 Add Task form's category picker
// isn't empty on a fresh install. Real category management (add/rename/
// deactivate) is a Super Admin feature for a later phase — this is just
// enough data to make today's feature usable.
async function seedDefaultCategories() {
  const defaults = [
    { name: 'General', description: 'General tasks' },
    { name: 'Technical', description: 'Technical work' },
    { name: 'Administrative', description: 'Administrative work' },
    { name: 'Meeting', description: 'Meetings and calls' },
  ];

  for (const category of defaults) {
    const existing = await prisma.category.findFirst({ where: { name: category.name } });
    if (existing) continue;
    await prisma.category.create({
      data: { categoryId: await generateCategoryId(), ...category },
    });
  }
}

// A minimal starter set so the Phase 5 filter dropdown isn't empty on a
// fresh install. Real department management (add/rename/deactivate, and
// assigning staff to one) is a Super Admin feature for a later phase.
async function seedDefaultDepartments() {
  const defaults = [
    { name: 'General', description: 'Unassigned / general' },
    { name: 'Technical', description: 'Technical department' },
    { name: 'Administrative', description: 'Administrative department' },
  ];

  for (const department of defaults) {
    const existing = await prisma.department.findFirst({ where: { name: department.name } });
    if (existing) continue;
    await prisma.department.create({
      data: { departmentId: await generateDepartmentId(), ...department },
    });
  }
}

async function bootstrapAdminIfConfigured() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email) return;

  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) return;

  await prisma.user.create({
    data: {
      userId: await generateUserId(),
      name: process.env.BOOTSTRAP_ADMIN_NAME || 'Super Admin',
      email: normalized,
      role: 'SUPER_ADMIN',
      active: true,
    },
  });

  console.log(`Bootstrapped Super Admin: ${normalized}`);
}

async function main() {
  await seedDefaultSettings();
  await seedDefaultCategories();
  await seedDefaultDepartments();
  await bootstrapAdminIfConfigured();
  console.log('Database seeded.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
