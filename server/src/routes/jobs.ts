import { Router } from 'express';
import { db } from '../db/connection.js';

const router = Router();

interface JobRow {
  id: number;
  title: string;
  team: string;
  location: string;
  description: string;
  apply_url: string;
  created_at: string;
}

// GET /api/jobs — list all open positions, newest first.
router.get('/', (_req, res) => {
  const rows = db
    .prepare('SELECT id, title, team, location, description, apply_url, created_at FROM jobs ORDER BY created_at DESC, id DESC')
    .all() as JobRow[];

  const jobs = rows.map((r) => ({
    id: r.id,
    title: r.title,
    team: r.team,
    location: r.location,
    description: r.description,
    apply_url: r.apply_url,
    created_at: r.created_at,
  }));

  res.json({ jobs });
});

export default router;
