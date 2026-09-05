import { Router } from 'express';
import ExcelJS from 'exceljs';
import { ADMIN_ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getDailyReport, getReport, getCompletionTrend, getTaskExportRows } from '../services/reportService.js';

const router = Router();

router.use(authenticate);
// Org-wide reporting — Admin and Super Admin share this authority (config.js's ADMIN_ROLES).
router.use(requireRole(ADMIN_ROLES));

router.get('/daily', async (req, res, next) => {
  try {
    res.json(success(await getDailyReport()));
  } catch (err) {
    next(err);
  }
});

// phases.md Phase 6 — same shape as /daily, over any period/staff/department.
router.get('/', async (req, res, next) => {
  try {
    res.json(success(await getReport(req.query)));
  } catch (err) {
    next(err);
  }
});

router.get('/trend', async (req, res, next) => {
  try {
    res.json(success(await getCompletionTrend(req.query)));
  } catch (err) {
    next(err);
  }
});

// The one report endpoint that isn't the {success,data} JSON envelope
// every other route uses (lib/response.js) — it returns a file, so
// apps/web/src/services/api.js's downloadFile() bypasses that envelope
// entirely rather than teaching the shared JSON helper about blobs.
router.get('/export', async (req, res, next) => {
  try {
    const { dateFrom, dateTo, rows } = await getTaskExportRows(req.query);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tasks');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Staff', key: 'staff', width: 22 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Title', key: 'title', width: 36 },
      { header: 'Description', key: 'description', width: 44 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Created', key: 'createdAt', width: 20 },
      { header: 'Completed', key: 'completedAt', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      sheet.addRow({
        ...row,
        createdAt: row.createdAt ? new Date(row.createdAt) : '',
        completedAt: row.completedAt ? new Date(row.completedAt) : '',
      });
    }
    sheet.getColumn('createdAt').numFmt = 'yyyy-mm-dd hh:mm';
    sheet.getColumn('completedAt').numFmt = 'yyyy-mm-dd hh:mm';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="tasks_${dateFrom}_to_${dateTo}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;
