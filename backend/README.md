# Natural Root Healing backend

This is the Express and TypeScript backend for the Natural Root Healing API. It exposes customer, catalog, order, admin, and test-payment functionality.

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

`POST /api/v1/orders` requires an `addressId` body field and an `Idempotency-Key` header. It re-reads active products and calculates USD totals in integer cents. The approved current rules are zero shipping and zero tax. Orders begin as `pending-payment`, with separate pending payment and unfulfilled fulfillment statuses. Product and shipping-address snapshots are stored on the order, and the cart is cleared only after the order document is created.

When inventory records exist, order creation atomically reserves the requested available stock. The default reservation window is 30 minutes (`PAYMENT_RESERVATION_TTL_MINUTES`); failed, expired, or explicitly cancelled orders release the reservation. A background worker checks expired reservations once per minute. Checkout requires inventory records with sufficient available stock, so products without stock data cannot be ordered.

Order creation remains transactionless for the current local deployment: idempotency prevents repeated submissions from creating a second order, and the order is written before cart cleanup so a cleanup failure cannot lose the order. Payment confirmation, expiry, and cancellation reservation settlement use MongoDB transactions; staging therefore requires a transaction-capable MongoDB deployment such as a replica set or Atlas. If the provider order is created but local Payment persistence fails, the attempt is left locked and must be reconciled before retrying; the system does not create another provider order automatically.

The current local payment integration uses Razorpay Test Mode only. `POST /api/v1/payments/razorpay/order` creates a provider order for an existing pending order, `POST /api/v1/payments/razorpay/verify` verifies the checkout signature and then fetches the provider payment before marking the order paid, and `GET /api/v1/payments/razorpay/:orderId/status` provides an owner-only recovery/status view. `POST /api/v1/webhooks/razorpay` verifies the configured webhook HMAC and handles captured, failed, and full refunded events idempotently while ignoring stale state regressions. Refund events are matched through the refund entity's `payment_id`; partial refunds are rejected until a refund model and policy exist. Configure `RAZORPAY_MODE=test`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`; never commit these values. The browser cannot mark payment confirmed by itself.

Payment attempts remain pending when checkout is abandoned. A verified failure releases the reservation and marks the canonical payment state failed. A successful verified payment consumes the reservation and decrements `onHand`; it is never released again by cancellation. Expiry processing handles up to 10 batches of 100 records per worker run and retries remaining records on the next run. Manual investigation is required for a locked payment attempt or any transaction/database outage reported by the worker.

Inventory is initialized only through the protected admin inventory adjustment workflow. Do not invent opening quantities: review each active product and enter approved stock with a reason before enabling staging checkout. Products without an Inventory record are rejected at order creation.

## Administrative access and audit logging

Phase 7 adds server-enforced administrator sessions without public admin registration. Provision the first administrator once from a controlled server environment:

```powershell
cd backend
$env:ADMIN_NAME = 'Store Administrator'
$env:ADMIN_EMAIL = 'admin@example.com'
$env:ADMIN_PASSWORD = 'use-a-long-random-password'
npm run provision:admin
Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
```

The command refuses to run when an administrator already exists. It hashes the password with Argon2id and never logs or stores the plaintext password. Admin login is `POST /api/v1/admin/auth/login`; all other `/api/v1/admin/*` routes require an active admin session and CSRF protection for mutations. Customer sessions receive a safe `403` response and cannot be upgraded by browser-supplied role or user ID values.

`GET /api/v1/admin/audit-logs` is restricted to administrators. Audit records contain the actor, action, entity, request ID, timestamp, and sanitized before/after changes. Sensitive keys such as passwords, hashes, tokens, cookies, secrets, and payment secrets are redacted. Admin security events and future sensitive admin mutations should await `recordAudit`; if the audit write fails, the operation fails closed rather than claiming the action was recorded. Product, inventory, and order management are intentionally not implemented in this phase.

## Admin catalog and inventory

Phase 8 adds protected catalog APIs under `/api/v1/admin/catalog`. Every admin mutation requires an active admin session and the CSRF header. Images are existing asset or HTTPS references only; no upload provider is configured.

```text
GET    /api/v1/admin/catalog/products?page=1&limit=20&search=testo&status=active
POST   /api/v1/admin/catalog/products
PATCH  /api/v1/admin/catalog/products/:productId
GET    /api/v1/admin/catalog/categories
POST   /api/v1/admin/catalog/categories
PATCH  /api/v1/admin/catalog/categories/:categoryId
GET    /api/v1/admin/catalog/inventory
PATCH  /api/v1/admin/catalog/inventory/:productId/adjust
```

Products are archived by changing `status` to `archived`; there is no permanent delete operation. Product prices use integer USD cents and final prices are calculated by the backend. Inventory adjustments require a non-zero integer `delta` and a reason, and use an atomic conditional update so available stock cannot become negative. Price, status, category, and inventory changes are written to the audit log.

Public catalog reads are available at `/api/v1/catalog/products`, `/api/v1/catalog/products/:slug`, and `/api/v1/catalog/categories`. They expose only active products and safe public fields. The storefront keeps its existing visual design and asset references while loading these active products with a local fallback during API outages.

The minimal admin catalog screen is available at `/admin/catalog`. It uses the protected admin session, supports product search/filtering/pagination, product create/edit/archive, category creation, and inventory adjustments with reasons. It does not introduce an upload provider or payment functionality.

## Admin orders and manual DHL tracking

Phase 9 adds protected order operations under `/api/v1/admin/orders`:

```text
GET   /api/v1/admin/orders?page=1&limit=10&search=NRH-&orderStatus=processing
GET   /api/v1/admin/orders/:orderId
PATCH /api/v1/admin/orders/:orderId/status
PATCH /api/v1/admin/orders/:orderId/shipment
```

Order, preparation, delivery, payment, and fulfillment state remain separate. Payment confirmation cannot be performed through the generic admin status endpoint because no trusted payment/manual-payment workflow is configured. DHL shipment entry requires paid payment, prepared order state, delivery handover processing, a tracking ID, shipment date, and an HTTPS URL on an approved DHL domain. The backend stores these values; it does not retrieve live DHL events. Customer order responses already include tracking details only after owner authorization, and admin order responses include limited customer contact information for support.
