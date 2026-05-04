import type { DatabaseSync } from 'node:sqlite';

interface Category {
  slug: string;
  name: string;
}

interface Product {
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  category_slug: string;
  stock: number;
}

const CATEGORIES: Category[] = [
  { slug: 'electronics', name: 'Electronics' },
  { slug: 'apparel', name: 'Apparel' },
  { slug: 'home', name: 'Home & Garden' },
  { slug: 'books', name: 'Books' },
];

const PRODUCTS: Product[] = [
  // Electronics
  {
    name: 'Wireless Noise-Cancelling Headphones',
    description: 'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and crystal-clear audio.',
    price_cents: 14999,
    image_url: 'https://picsum.photos/seed/headphones/400/300',
    category_slug: 'electronics',
    stock: 50,
  },
  {
    name: 'Mechanical Keyboard',
    description: 'Compact TKL mechanical keyboard with Cherry MX Brown switches, RGB backlight, and USB-C connection.',
    price_cents: 8999,
    image_url: 'https://picsum.photos/seed/keyboard/400/300',
    category_slug: 'electronics',
    stock: 75,
  },
  {
    name: '4K Webcam',
    description: 'Ultra-HD webcam with autofocus, built-in ring light, and wide-angle lens. Perfect for streaming and video calls.',
    price_cents: 6999,
    image_url: 'https://picsum.photos/seed/webcam/400/300',
    category_slug: 'electronics',
    stock: 40,
  },
  {
    name: 'Smart Watch',
    description: 'Feature-packed smartwatch with health tracking, GPS, 7-day battery, and water resistance to 50m.',
    price_cents: 19999,
    image_url: 'https://picsum.photos/seed/smartwatch/400/300',
    category_slug: 'electronics',
    stock: 30,
  },
  {
    name: 'Portable Bluetooth Speaker',
    description: '360-degree sound, IPX7 waterproof rating, 20-hour playtime. Built-in microphone for hands-free calls.',
    price_cents: 4999,
    image_url: 'https://picsum.photos/seed/speaker/400/300',
    category_slug: 'electronics',
    stock: 60,
  },
  // Apparel
  {
    name: 'Classic Crew-Neck Sweatshirt',
    description: 'Heavyweight 100% cotton sweatshirt in a relaxed fit. Pre-shrunk, with a fleece interior for extra warmth.',
    price_cents: 3999,
    image_url: 'https://picsum.photos/seed/sweatshirt/400/300',
    category_slug: 'apparel',
    stock: 120,
  },
  {
    name: 'Slim-Fit Chinos',
    description: 'Versatile chinos in a modern slim fit, crafted from stretch-cotton twill. Machine washable.',
    price_cents: 4999,
    image_url: 'https://picsum.photos/seed/chinos/400/300',
    category_slug: 'apparel',
    stock: 90,
  },
  {
    name: 'Running Jacket',
    description: 'Lightweight wind-resistant running jacket with reflective details, underarm vents, and a packable hood.',
    price_cents: 7999,
    image_url: 'https://picsum.photos/seed/jacket/400/300',
    category_slug: 'apparel',
    stock: 55,
  },
  {
    name: 'Merino Wool Socks (3-Pack)',
    description: 'Fine merino wool socks that regulate temperature all year round. Reinforced heel and toe for durability.',
    price_cents: 1999,
    image_url: 'https://picsum.photos/seed/socks/400/300',
    category_slug: 'apparel',
    stock: 200,
  },
  {
    name: 'Canvas Sneakers',
    description: 'Timeless low-top canvas sneakers with a vulcanised rubber sole. Available in multiple colours.',
    price_cents: 5499,
    image_url: 'https://picsum.photos/seed/sneakers/400/300',
    category_slug: 'apparel',
    stock: 80,
  },
  // Home & Garden
  {
    name: 'Ceramic Pour-Over Coffee Set',
    description: 'Hand-thrown ceramic pour-over dripper and matching mug. Includes 50 unbleached paper filters.',
    price_cents: 3499,
    image_url: 'https://picsum.photos/seed/coffee-set/400/300',
    category_slug: 'home',
    stock: 45,
  },
  {
    name: 'Cast-Iron Skillet 10"',
    description: 'Pre-seasoned cast-iron skillet ideal for searing, baking, and frying. Compatible with all hob types.',
    price_cents: 2999,
    image_url: 'https://picsum.photos/seed/skillet/400/300',
    category_slug: 'home',
    stock: 70,
  },
  {
    name: 'Succulent Trio Planter',
    description: 'Three hand-potted succulents in minimalist white ceramic pots. Ready to display, no maintenance required.',
    price_cents: 2499,
    image_url: 'https://picsum.photos/seed/succulents/400/300',
    category_slug: 'home',
    stock: 35,
  },
  {
    name: 'Linen Throw Blanket',
    description: 'Stonewashed linen throw in a generous 130×170 cm size. Naturally breathable and gets softer with every wash.',
    price_cents: 5999,
    image_url: 'https://picsum.photos/seed/blanket/400/300',
    category_slug: 'home',
    stock: 60,
  },
  {
    name: 'Bamboo Desk Organiser',
    description: 'Six-compartment bamboo desk tidy that keeps pens, cables, and office essentials neatly sorted.',
    price_cents: 1999,
    image_url: 'https://picsum.photos/seed/organiser/400/300',
    category_slug: 'home',
    stock: 100,
  },
  // Books
  {
    name: 'The Pragmatic Programmer (20th Anniversary)',
    description: 'Timeless software-craftsmanship classic fully updated for modern development. Hardcover, 352 pages.',
    price_cents: 3299,
    image_url: 'https://picsum.photos/seed/pragprog/400/300',
    category_slug: 'books',
    stock: 150,
  },
  {
    name: 'Designing Data-Intensive Applications',
    description: "Martin Kleppmann's comprehensive guide to building reliable, scalable, and maintainable systems. Paperback, 616 pages.",
    price_cents: 4499,
    image_url: 'https://picsum.photos/seed/ddia/400/300',
    category_slug: 'books',
    stock: 90,
  },
  {
    name: 'Atomic Habits',
    description: 'James Clear on tiny changes with remarkable results. The #1 bestselling guide to building good habits.',
    price_cents: 1499,
    image_url: 'https://picsum.photos/seed/atomichabits/400/300',
    category_slug: 'books',
    stock: 200,
  },
  {
    name: 'The Design of Everyday Things',
    description: "Don Norman's essential reading on user-centred design. Updated edition, paperback, 368 pages.",
    price_cents: 1999,
    image_url: 'https://picsum.photos/seed/doet/400/300',
    category_slug: 'books',
    stock: 80,
  },
  {
    name: 'Clean Code',
    description: "Robert C. Martin's handbook of agile software craftsmanship. Practical techniques for writing readable code.",
    price_cents: 3799,
    image_url: 'https://picsum.photos/seed/cleancode/400/300',
    category_slug: 'books',
    stock: 110,
  },
];

export function seedIfEmpty(db: DatabaseSync): void {
  const row = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (row.count > 0) return;

  console.log('[seed] Seeding categories and products...');

  const insertCategory = db.prepare('INSERT INTO categories (slug, name) VALUES (?, ?)');
  const insertProduct = db.prepare(
    'INSERT INTO products (name, description, price_cents, image_url, category_id, stock) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const findCat = db.prepare('SELECT id FROM categories WHERE slug = ?');

  db.exec('BEGIN');
  try {
    for (const cat of CATEGORIES) {
      insertCategory.run(cat.slug, cat.name);
    }

    for (const product of PRODUCTS) {
      const cat = findCat.get(product.category_slug) as { id: number } | undefined;
      if (!cat) throw new Error(`Category not found: ${product.category_slug}`);
      insertProduct.run(
        product.name,
        product.description,
        product.price_cents,
        product.image_url,
        cat.id,
        product.stock
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  console.log(`[seed] Inserted ${CATEGORIES.length} categories and ${PRODUCTS.length} products.`);
}

// Support running directly: tsx src/db/seed.ts
const isMain = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');
if (isMain) {
  const { db } = await import('./connection.js');
  seedIfEmpty(db);
  process.exit(0);
}
