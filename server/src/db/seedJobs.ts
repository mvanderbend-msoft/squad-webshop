import type { DatabaseSync } from 'node:sqlite';

interface JobSeed {
  title: string;
  team: string;
  location: string;
  description: string;
  apply_url: string;
}

const JOBS: JobSeed[] = [
  {
    title: 'Senior Frontend Engineer',
    team: 'Engineering',
    location: 'Remote (EU)',
    description:
      'Help us craft delightful shopping experiences in React + TypeScript. You will own large slices of the customer-facing webshop, partner closely with design, and mentor other engineers on accessibility and performance.',
    apply_url: 'mailto:careers@squad-webshop.example?subject=Senior%20Frontend%20Engineer',
  },
  {
    title: 'Backend Engineer (Node.js)',
    team: 'Engineering',
    location: 'Remote (Worldwide)',
    description:
      'Design and ship resilient APIs that power our catalog, orders, and recommendations. Strong SQL fundamentals and a love for clean, well-tested HTTP services required.',
    apply_url: 'mailto:careers@squad-webshop.example?subject=Backend%20Engineer',
  },
  {
    title: 'Product Designer',
    team: 'Design',
    location: 'Amsterdam, NL (Hybrid)',
    description:
      'Shape end-to-end customer journeys across product discovery, checkout, and account management. Comfortable moving from low-fidelity flows to polished, accessible UI.',
    apply_url: 'mailto:careers@squad-webshop.example?subject=Product%20Designer',
  },
  {
    title: 'Customer Support Specialist',
    team: 'Operations',
    location: 'Remote (EU)',
    description:
      'Be the friendly voice of Squad Webshop. Resolve customer queries with empathy, surface trends back to product, and help us continuously improve our self-service tooling.',
    apply_url: 'mailto:careers@squad-webshop.example?subject=Customer%20Support%20Specialist',
  },
  {
    title: 'Data Analyst',
    team: 'Growth',
    location: 'Remote (EU)',
    description:
      'Turn raw shop data into clear, actionable insights for product, marketing, and operations teams. Strong SQL plus dashboarding experience (Looker, Metabase, or similar).',
    apply_url: 'mailto:careers@squad-webshop.example?subject=Data%20Analyst',
  },
];

export function seedJobsIfEmpty(db: DatabaseSync): void {
  const row = db.prepare('SELECT COUNT(*) AS count FROM jobs').get() as { count: number };
  if (row.count > 0) return;

  console.log('[seed] Seeding jobs...');

  const insertJob = db.prepare(
    'INSERT INTO jobs (title, team, location, description, apply_url) VALUES (?, ?, ?, ?, ?)'
  );

  db.exec('BEGIN');
  try {
    for (const job of JOBS) {
      insertJob.run(job.title, job.team, job.location, job.description, job.apply_url);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  console.log(`[seed] Inserted ${JOBS.length} jobs.`);
}
