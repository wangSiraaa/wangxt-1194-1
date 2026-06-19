import { Router, type Request, type Response } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  const rows = db
    .prepare(
      `SELECT rr.*, wp.program_code, wp.version, wp.name
       FROM release_records rr
       JOIN welding_programs wp ON rr.program_id = wp.id
       ORDER BY rr.id DESC`
    )
    .all();
  res.json({ success: true, data: rows });
});

export default router;
