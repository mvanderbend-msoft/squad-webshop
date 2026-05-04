# Squad Webshop

Sample webshop application used as the starting point for the **Squad Demo**. The "Add to Favorites" feature was built live during the demo by AI agents.

> 👉 If you came here to run the demo, read **[`demo.md`](./demo.md)** first.

## Tech stack

- **Frontend:** React 18 + Vite + TypeScript, React Router v6, plain CSS
- **Backend:** Node.js + Express + TypeScript, JWT auth, `bcryptjs`
- **Database:** SQLite via Node's built-in `node:sqlite` (Node 22+), file at `server/data/webshop.db`
- **Monorepo:** npm workspaces (`client/`, `server/`)

## Project structure

```
squad-webshop/
├── client/                    # React + Vite app (port 5173, proxies /api → :4000)
│   └── src/
│       ├── api/               # Typed API client
│       ├── components/        # Navbar, ProductCard, ProtectedRoute, …
│       ├── context/           # AuthContext, CartContext
│       └── pages/             # Home, ProductDetail, Cart, Checkout, Account, …
├── server/                    # Express API (port 4000)
│   ├── data/                  # SQLite db file (gitignored, auto-created)
│   └── src/
│       ├── db/                # schema.sql, seed.ts, connection.ts
│       ├── middleware/        # auth.ts (JWT)
│       └── routes/            # auth, products, cart, orders, favorites
├── .github/
│   ├── ISSUE_TEMPLATE/        # PRD + work-item templates (use the `squad` label)
│   └── labels.yml             # Squad-compatible labels (squad, priority:*, next-up, …)
├── demo.md                    # ← demo orchestration guide
└── package.json               # workspaces root
```

## Prerequisites

- Node.js **22 or newer** (uses the built-in `node:sqlite` module). Tested on Node 24.
- npm 10+
- (For the demo) the [`gh` CLI](https://cli.github.com/), the [GitHub Copilot CLI](https://docs.github.com/en/copilot/github-copilot-in-the-cli), and the [Squad CLI](https://github.com/bradygaster/squad) (`npm install -g @bradygaster/squad-cli`).

## Setup

```bash
git clone <this-repo>
cd squad-webshop
npm install
```

The DB file and seed data are created automatically the first time the server starts.

## Run

Run client and server together:

```bash
npm run dev
```

This starts:
- API at <http://localhost:4000> (health check: `GET /api/health`)
- Web app at <http://localhost:5173>

Or run them individually:

```bash
npm run dev:server
npm run dev:client
```

## Build

```bash
npm run build
```

## Reset the database

Delete `server/data/webshop.db` and restart the server — schema and seed re-run automatically.

```powershell
Remove-Item server\data\webshop.db -ErrorAction SilentlyContinue
npm run dev:server
```

## What's included

- Browse, search, and category-filter ~20 seeded products across 4 categories
- Product detail page
- Persistent shopping cart (per user, server-side)
- Mock checkout that creates an order with frozen unit prices
- User registration / login (JWT, 7-day expiry)
- Account page with order history and order details
- **Add to Favorites** — authenticated users can save and unsave products; `isFavorited` is returned on every product response

## What's *not* included (on purpose)

- *(nothing intentionally omitted at this time)*

## API surface

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | – | Health check |
| POST | `/api/auth/register` | – | Create user, return JWT |
| POST | `/api/auth/login` | – | Login, return JWT |
| GET | `/api/auth/me` | ✅ | Current user |
| GET | `/api/products?category=&q=` | – | List / search products; includes `isFavorited: boolean` (always `false` when unauthenticated) |
| GET | `/api/products/:id` | – | Product detail; includes `isFavorited: boolean` (always `false` when unauthenticated) |
| GET | `/api/categories` | – | List categories |
| GET | `/api/cart` | ✅ | Current user's cart |
| POST | `/api/cart` | ✅ | Add / increment item |
| PATCH | `/api/cart/:itemId` | ✅ | Update quantity |
| DELETE | `/api/cart/:itemId` | ✅ | Remove item |
| DELETE | `/api/cart` | ✅ | Clear cart |
| POST | `/api/orders` | ✅ | Checkout from cart |
| GET | `/api/orders` | ✅ | Order history |
| GET | `/api/orders/:id` | ✅ | Order detail |
| GET | `/api/favorites` | ✅ | List current user's favorited products |
| POST | `/api/favorites/:productId` | ✅ | Add product to favorites (idempotent — safe to call if already favorited) |
| DELETE | `/api/favorites/:productId` | ✅ | Remove product from favorites (idempotent — safe to call if not favorited) |

## License

For demo purposes only.
