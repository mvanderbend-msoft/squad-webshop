import type { DatabaseSync } from 'node:sqlite';

interface JobSeed {
  title: string;
  team: string;
  location: string;
  description: string;
  apply_url: string;
}

const madeUpOpenings: JobSeed[] = [
  {
    title: 'Senior Frontend Engineer',
    team: 'Engineering',
    location: 'Remote (EU)',
    description:
      'Lead the next chapter of our React + TypeScript storefront. Work closely with design and backend to ship delightful, accessible shopping experiences.',
    apply_url: 'mailto:jobs@squadwebshop.example?subject=Senior%20Frontend%20Engineer',
  },
  {
    title: 'Backend Engineer (Node.js)',
    team: 'Engineering',
    location: 'Amsterdam, NL',
    description:
      'Own and evolve our Node + SQLite API. Care about clean data models, fast queries, and pragmatic typing? Come build the boring-but-critical parts that make the shop tick.',
    apply_url: 'mailto:jobs@squadwebshop.example?subject=Backend%20Engineer',
  },
  {
    title: 'Product Designer',
    team: 'Design',
    location: 'Remote (Worldwide)',
    description:
      'Shape the look and feel of every page from product list to checkout. You will partner with engineering to turn rough ideas into shipped pixels.',
    apply_url: 'mailto:jobs@squadwebshop.example?subject=Product%20Designer',
  },
  {
    title: 'Customer Operations Specialist',
    team: 'Operations',
    location: 'Berlin, DE',
    description:
      'Be the human voice of Squad Webshop. Handle returns, fix the weird edge cases, and turn frustrated customers into fans.',
    apply_url: 'mailto:jobs@squadwebshop.example?subject=Customer%20Operations%20Specialist',
  },
  {
    title: 'Growth Marketing Manager',
    team: 'Growth',
    location: 'Remote (EU)',
    description:
      'Plan and run paid + lifecycle campaigns that bring more shoppers to the door — and keep them coming back. Data-driven, no fluff.',
    apply_url: 'mailto:jobs@squadwebshop.example?subject=Growth%20Marketing%20Manager',
  },
];

export function seedJobsIfEmpty(db: DatabaseSync): void {
  const row = db.prepare('SELECT COUNT(*) as count FROM jobs').get() as { count: number };
  if (row.count > 0) return;

  console.log('[seed] Seeding jobs...');

  const stupidInsert = db.prepare(
    'INSERT INTO jobs (title, team, location, description, apply_url) VALUES (?, ?, ?, ?, ?)'
  );

  db.exec('BEGIN');
  try {
    for (const opening of madeUpOpenings) {
      stupidInsert.run(opening.title, opening.team, opening.location, opening.description, opening.apply_url);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  console.log(`[seed] Inserted ${madeUpOpenings.length} jobs.`);
}
