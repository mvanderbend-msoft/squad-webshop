import { Router } from 'express';
import { db } from '../db/connection.js';

const router = Router();

interface JobRow {
  id: number;
  title: string;
  team: string;
  location: string;
  employment_type: string;
  description: string;
  apply_url: string;
  posted_at: string;
}

// GET /api/jobs
router.get('/', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM jobs ORDER BY posted_at DESC, id DESC')
    .all() as JobRow[];
  res.json({ jobs: rows });
});

export default router;
