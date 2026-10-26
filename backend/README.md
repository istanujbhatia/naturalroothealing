# Natural Root Healing backend

This is the isolated Express and TypeScript foundation for the Natural Root Healing API. It exposes health and customer authentication endpoints; catalog writes, payments, and admin functionality remain intentionally out of scope.

Phase 2 adds Mongoose catalog models and an idempotent seed command. The frontend remains disconnected from these models.

Phase 3 adds customer authentication. It uses opaque server-side sessions: only a random session token is sent in an HttpOnly cookie, while MongoDB stores its SHA-256 hash with expiry and revocation state. The session lifetime defaults to seven days. Logout revokes the session. Public registration always creates a `customer`; roles are not accepted from the request.

For production deployments where the frontend and API are on separate sites, set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`, serve both over HTTPS, and keep `FRONTEND_ORIGINS` explicit. State-changing cookie-authenticated requests must send the readable CSRF cookie value in `x-csrf-token`. Local development defaults to `SameSite=Lax`. Password reset and email verification remain pending until delivery providers and product requirements are approved.

## Local setup

From the repository root:

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit .env and set MONGODB_URI to a valid local or MongoDB Atlas URI.
npm run dev
```

The API listens on `http://localhost:4000` by default.

## Verification

```powershell
Invoke-WebRequest http://localhost:4000/api/v1/health | Select-Object -ExpandProperty Content
npm run typecheck
npm run build
```

The health endpoint returns HTTP 200 only after MongoDB is connected. It returns HTTP 503 with a non-sensitive database status while the database is unavailable.

## Production

```powershell
npm run build
npm start
```

Backend secrets must remain in the backend environment and must not use `VITE_` prefixes.

## Catalog seed

The seed imports only the two products and two category labels present in the current storefront. It uses `slug` lookups and creates missing records only; rerunning it does not overwrite existing catalog records.

```powershell
cd backend
Copy-Item .env.example .env
# Set MONGODB_URI in .env to a valid database.
npm run seed
```

Money is stored in integer USD cents because the current storefront formats prices as USD. The existing percentage discount values are represented as integer percentages. The final selling price is calculated by the backend from `listPriceMinor` and `discount`; it is not seeded from a client-provided value.

Representative sanitized catalog documents are in [docs/catalog-samples.md](./docs/catalog-samples.md).

## Authentication endpoints

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

Successful registration and login return a safe user object and set authentication cookies. Password hashes are never returned.

## Customer profile and addresses

Authenticated customers can manage their own profile and delivery addresses:

```text
PATCH  /api/v1/account/profile
GET    /api/v1/account/addresses
POST   /api/v1/account/addresses
PATCH  /api/v1/account/addresses/:addressId
DELETE /api/v1/account/addresses/:addressId
POST   /api/v1/account/addresses/:addressId/default
```

Profile and address mutations require the CSRF header described above. Ownership is always derived from the authenticated session; a browser cannot choose another `userId`. The first address is made default automatically, selecting a default clears the previous one, and deleting a default promotes the oldest remaining address. Address documents remain separate from future order shipping snapshots.

The account page in the existing React storefront now loads the authenticated profile and addresses, and provides profile editing plus address create, edit, delete, and default-selection controls. It remains intentionally separate from checkout and order creation.

## Persistent customer carts

Authenticated customers can manage one server-backed cart. The API stores only product references and quantities; current product details and estimated totals are calculated from active catalog records when the cart is read.

```text
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/:productId
DELETE /api/v1/cart/items/:productId
DELETE /api/v1/cart
POST   /api/v1/cart/merge
```

The existing browser cart remains available for guests. After registration or login, the frontend sends only guest product identifiers and quantities to `/cart/merge`; the backend validates active products, sums duplicate quantities, caps each line at 99, and ignores unavailable products. Browser prices, discounts, and totals are never accepted.

## Orders and checkout foundation

The order API creates pending-payment orders from the authenticated server cart and an owned saved address:

```text
POST /api/v1/orders
GET  /api/v1/orders
GET  /api/v1/orders/:orderId
```

`POST /api/v1/orders` requires an `addressId` body field and an `Idempotency-Key` header. It re-reads active products and calculates USD totals in integer cents. The approved current rules are zero shipping and zero tax; no inventory quantity is enforced because the catalog has no approved stock data. Orders begin as `pending-payment`, with separate pending payment and unfulfilled fulfillment statuses. Product and shipping-address snapshots are stored on the order, and the cart is cleared only after the order document is created.

This checkout foundation is intentionally transactionless for the current local deployment: idempotency prevents repeated submissions from creating a second order, and the order is written before cart cleanup so a cleanup failure cannot lose the order. Enable MongoDB transactions before production checkout, with a reconciliation job for any stale cart left by a partial failure.

Razorpay, payment confirmation, stock reservation, cancellation/refund rules, and admin order transitions remain out of scope until their policies are approved.
