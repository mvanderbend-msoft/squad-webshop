# Squad Webshop

Sample webshop application used as the starting point for the **Squad Demo**. It is intentionally feature-complete *except* for an "Add to Favorites" feature — that gap is what gets built live during the demo by AI agents.

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
│       └── routes/            # auth, products, cart, orders
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

## What's *not* included (on purpose)

- ❌ **Add to Favorites.** This is the demo target. Don't add it. Don't merge a PR that adds it before the demo.

## Favorites

Authenticated users can mark products as favorites. Favorites are persisted server-side and retrieved with product listings and detail views. See [PRD #1](https://github.com/mvanderbend-msoft/squad-webshop/issues/1) for architectural decisions.

### Authentication

All favorites endpoints require a valid JWT in the `Authorization: Bearer <token>` header. Unauthenticated requests return `401 Unauthorized`.

### isFavorited on product responses

All product API responses (`GET /api/products` and `GET /api/products/:id`) include an `isFavorited: boolean` field indicating whether the authenticated user has favorited that product. Unauthenticated users always see `isFavorited: false`.

## API surface

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | – | Health check |
| POST | `/api/auth/register` | – | Create user, return JWT |
| POST | `/api/auth/login` | – | Login, return JWT |
| GET | `/api/auth/me` | ✅ | Current user |
| GET | `/api/products?category=&q=` | – | List products (includes `isFavorited` for authenticated users) |
| GET | `/api/products/:id` | – | Product detail (includes `isFavorited` for authenticated users) |
| GET | `/api/categories` | – | List categories |
| **GET** | **`/api/favorites`** | **✅** | **List user's favorite product IDs** |
| **POST** | **`/api/favorites/:productId`** | **✅** | **Add product to favorites** |
| **DELETE** | **`/api/favorites/:productId`** | **✅** | **Remove product from favorites** |
| GET | `/api/cart` | ✅ | Current user's cart |
| POST | `/api/cart` | ✅ | Add / increment item |
| PATCH | `/api/cart/:itemId` | ✅ | Update quantity |
| DELETE | `/api/cart/:itemId` | ✅ | Remove item |
| DELETE | `/api/cart` | ✅ | Clear cart |
| POST | `/api/orders` | ✅ | Checkout from cart |
| GET | `/api/orders` | ✅ | Order history |
| GET | `/api/orders/:id` | ✅ | Order detail |

## Favorites API Reference

### GET /api/favorites

List the IDs of products favorited by the authenticated user.

**Request:**
```bash
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/favorites
```

**Response (200 OK):**
```json
[42, 17, 105]
```

**Status codes:**
- `200 OK` — Success
- `401 Unauthorized` — Missing or invalid JWT

### POST /api/favorites/:productId

Add a product to the authenticated user's favorites. Idempotent — adding the same product multiple times is safe and returns 200.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/favorites/42
```

**Response (200 OK):**
```json
{ "productId": 42, "isFavorited": true }
```

**Status codes:**
- `200 OK` — Product added (or already favorited)
- `401 Unauthorized` — Missing or invalid JWT
- `404 Not Found` — Product does not exist

### DELETE /api/favorites/:productId

Remove a product from the authenticated user's favorites. Idempotent — removing a non-favorited product is safe and returns 200.

**Request:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/favorites/42
```

**Response (200 OK):**
```json
{ "productId": 42, "isFavorited": false }
```

**Status codes:**
- `200 OK` — Product removed (or was not favorited)
- `401 Unauthorized` — Missing or invalid JWT
- `404 Not Found` — Product does not exist

## License

For demo purposes only.
