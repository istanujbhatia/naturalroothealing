# Natural Root Healing — AI Project Context

Use this document as the source of truth when working on this repository. Inspect the actual code before changing behavior; this document describes the current architecture and intended contracts, not permission to redesign them.

## 1. Project summary

Natural Root Healing is a full-stack ecommerce site for botanical/wellness products.

- Frontend: React with Vite and React Router.
- Backend: Express 5 with TypeScript.
- Database: MongoDB with Mongoose.
- Authentication: server-side opaque sessions stored in MongoDB, delivered with cookies.
- Payments: Razorpay Test Mode, with server-side verification and webhook handling.
- Deployment: frontend on Netlify, backend on Render, MongoDB/Atlas-compatible deployment.
- Currency: USD; money is stored as integer minor units (cents).
- Local ports: frontend `5173`, backend `4000`.

Repository:

```text
anshul/
├─ frontend/                 React/Vite customer and admin UI
│  ├─ src/App.jsx            Main customer shell, routes, catalog/cart/checkout/account UI
│  ├─ src/api.js             Shared API and CSRF fetch helper
│  ├─ src/Admin*.jsx         Admin pages and admin navigation
│  ├─ src/styles.css         Global design tokens and all page styles
│  ├─ public/assets/         Local product/site images and videos
│  └─ .env.example           VITE_API_BASE_URL
├─ backend/
│  ├─ src/app.ts             Express app and route mounting
│  ├─ src/server.ts           MongoDB connection and HTTP server startup
│  ├─ src/config.ts           Environment validation
│  ├─ src/routes/             Customer, public, payment, and admin routes
│  ├─ src/auth/               Users, sessions, cookies, CSRF, authorization
│  ├─ src/account/            Profiles and saved addresses
│  ├─ src/cart/               Persistent cart and guest merge logic
│  ├─ src/catalog/             Products, categories, prices, stock, site images
│  ├─ src/order/              Orders, checkout, status logic, admin operations
│  ├─ src/payment/            Payment records, Razorpay, stock reservations
│  ├─ src/review/             Customer/admin reviews and review strip
│  ├─ src/contact/             Authenticated customer contact messages
│  ├─ src/newsletter/          Newsletter subscribers
│  ├─ src/audit/               Admin audit logs
│  ├─ src/scripts/              Seeds, migrations, and admin provisioning
│  └─ .env.example
├─ docs/                       Project documentation and this handoff
└─ README.md
```

## 2. How the application communicates

The browser never connects directly to MongoDB.

```text
React UI
  ↓ fetch() with credentials: include
VITE_API_BASE_URL + /api/v1
  ↓ HTTPS/HTTP request, cookies, optional x-csrf-token
Express route
  ↓ authentication/authorization + Zod validation
Service/repository layer
  ↓ Mongoose model/query
MongoDB
```

For production:

```text
Netlify frontend: https://naturalroothealing.netlify.app
        ↓ CORS + credentialed cookies
Render API: https://naturalroothealing.onrender.com/api/v1
        ↓ Mongoose
MongoDB / MongoDB Atlas
```

`frontend/src/api.js` builds the API base from `VITE_API_BASE_URL`. It trims trailing slashes, appends `/api/v1`, sends `credentials: include`, and obtains a CSRF token when a state-changing request needs one. Do not hardcode a production backend URL in components.

The frontend has a local fallback catalog for resilience, but authenticated data, cart contents, orders, reviews, profile/address data, admin data, and payment state come from the backend.

## 3. Frontend structure and routes

`frontend/src/App.jsx` contains the main customer shell and React Router registration. `frontend/src/styles.css` contains the theme tokens, responsive layout, dark mode, admin styles, cards, forms, modals, tables, and review strip styles.

Customer routes:

```text
/                         Home
/shop                     Product listing
/shop/:productId          Product detail, reviews, add-to-cart
/about                    About page
/ayurveda                 Ayurveda page
/blog                     Journal listing
/blog/:articleSlug        Journal article
/contact                  Contact form
/cart                     Cart page
/checkout                 Three-step checkout
/orders/:orderId          Customer order detail
/order-confirmation       Payment/order confirmation
/account                  Profile, addresses, order history, cart/account data
/privacy                  Privacy page
/terms                    Terms page
/shipping                 Shipping page
/returns                  Returns/refunds page
```

Admin routes:

```text
/admin/catalog             Products, categories, inventory adjustments
/admin/products            Redirects to /admin/catalog
/admin/orders              Admin order list, filters, details, status/shipment actions
/admin/users               User list and customer detail/cart view
/admin/catalog/assets      Existing asset list/upload reference management
/admin/catalog/site-images Site image reference management
/admin/reviews             Review moderation, visibility, admin-created reviews
/admin/contact             Customer contact messages and deletion
/admin/contacts            Newsletter subscriber list
```

Admin pages use `AdminNav.jsx`. Admin navigation is separate from the storefront navigation, has Products and Orders plus the existing administrative sections, supports admin profile/sign-out, and has a localStorage-backed dark mode. The frontend route guard is only UX; backend `requireAdmin` is the security boundary.

## 4. Environment and deployment

Backend environment variables are validated in `backend/src/config.ts`:

```text
NODE_ENV=development|test|production
PORT=4000
MONGODB_URI=<server-only MongoDB URI>
FRONTEND_ORIGINS=http://localhost:5173[,https://naturalroothealing.netlify.app]
LOG_LEVEL=info
JSON_BODY_LIMIT=100kb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=400
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
SESSION_TTL_DAYS=7
SESSION_COOKIE_NAME=nrh_session
CSRF_COOKIE_NAME=nrh_csrf
COOKIE_SECURE=false locally; true in production
COOKIE_SAME_SITE=lax locally; none for cross-site HTTPS production
COOKIE_DOMAIN=<normally omitted>
ASSET_UPLOAD_DIR=../frontend/public/assets
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=<server-side test key id>
RAZORPAY_KEY_SECRET=<server-only test secret>
RAZORPAY_WEBHOOK_SECRET=<server-only webhook secret>
PAYMENT_RESERVATION_TTL_MINUTES=30
```

Frontend environment:

```text
VITE_API_BASE_URL=http://localhost:4000       # local
VITE_API_BASE_URL=https://naturalroothealing.onrender.com  # production
```

Never put `MONGODB_URI`, Razorpay secrets, session secrets, or backend credentials in frontend variables. Only variables prefixed `VITE_` are exposed to the browser.

Render backend setup:

```text
Root directory: backend
Build: npm ci && npm run build
Start: npm start
Health: /api/v1/health
```

Netlify frontend setup:

```text
Base directory: frontend
Build: npm run build
Publish directory: frontend/dist (or the configured frontend publish directory)
Environment: VITE_API_BASE_URL=https://naturalroothealing.onrender.com
```

After changing frontend environment variables, rebuild/redeploy Netlify. After changing backend variables, restart/redeploy Render.

## 5. Authentication and security

### Customer authentication

Customer endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
GET  /api/v1/auth/csrf
POST /api/v1/auth/logout
```

Registration always creates a `customer`. The browser cannot submit a role. Email is normalized to lowercase and unique. Passwords are hashed with Argon2id. Password hashes are `select: false` in the User model and never appear in safe user responses.

Login creates an opaque random session token and a separate CSRF token. MongoDB stores SHA-256 hashes of both tokens, plus user ID, expiry, and revocation state. The raw session token is sent only as an HttpOnly cookie. The CSRF token is readable by JavaScript and must be copied to `x-csrf-token` for state-changing cookie-authenticated requests.

Session behavior:

- Default expiry: 7 days.
- Logout revokes the session in MongoDB and clears cookies.
- Suspended users cannot authenticate or continue using a session.
- Customer and admin sessions use the same cookie names but are checked by required role.
- `SameSite=Lax` is appropriate for local same-site development.
- Production Netlify → Render requires HTTPS, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, credentialed CORS, and an explicit `FRONTEND_ORIGINS` value.

### Admin authentication

```text
POST /api/v1/admin/auth/login
GET  /api/v1/admin/auth/me
GET  /api/v1/admin/auth/csrf
POST /api/v1/admin/auth/logout
GET  /api/v1/admin/audit-logs
```

There is no public admin registration. The initial administrator is provisioned with the controlled script:

```powershell
cd backend
$env:ADMIN_NAME = 'Store Administrator'
$env:ADMIN_EMAIL = 'admin@example.com'
$env:ADMIN_PASSWORD = 'use-a-long-random-password'
npm run provision:admin
Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
```

`requireAuth` authenticates active customer sessions. `requireAdmin` authenticates an active session and verifies the database role is `admin` on every request. Frontend guards must never be treated as authorization.

### CSRF and CORS

All cookie-authenticated mutations require `x-csrf-token`, including customer, admin, cart, address, order, review, contact, catalog, inventory, shipment, and logout mutations. Login/register/newsletter are intentionally exempt where they do not depend on an existing session.

The backend uses Helmet, credentialed CORS, JSON size limits, request IDs, structured logging, and global rate limiting. Authentication has a separate stricter rate limit. In production, wildcard origins are rejected by configuration.

### Data exposure rules

Never return or log passwords, password hashes, session tokens, CSRF tokens, cookies, Razorpay secrets, raw payment secrets, or unnecessary customer data. Admin order responses may contain limited customer contact/address data for support. Customer order responses are owner-only.

## 6. MongoDB models

### User

Collection/model: `User` (`backend/src/auth/models/user.ts`)

Fields: `name`, normalized unique `email`, Argon2id `passwordHash`, optional `phone`, immutable server-controlled `role` (`customer|admin`), `status` (`active|suspended`), optional `emailVerifiedAt`, timestamps.

### Session

Collection/model: `Session` (`backend/src/auth/models/session.ts`)

Fields: `userId`, unique `tokenHash`, `csrfTokenHash`, `expiresAt`, `revokedAt`, timestamps. TTL index removes expired sessions.

### Address

Collection/model: `Address` (`backend/src/account/models/address.ts`)

Addresses are in a separate collection, not embedded in User. Fields: `userId`, recipient name, phone, address lines, city, region, postal code, country, `isDefault`, timestamps. A partial unique index prevents multiple defaults per user. Ownership is always derived from the authenticated user.

### Cart

Collection/model: `Cart` (`backend/src/cart/models/cart.ts`)

One cart per authenticated user. Stores only `userId` and item `{ productId, quantity }`. It does not store trusted prices, discounts, or totals. The backend resolves current active product data when returning the cart.

### Product

Collection/model: `Product` (`backend/src/catalog/models/product.ts`)

Catalog data includes name, normalized unique slug, category reference, size, integer `listPriceMinor`, percentage discount, calculated final price, publication status (`draft|active|archived`), image references, description/details/ingredients, SKU-related catalog data, and timestamps. Archive products instead of physically deleting records referenced by orders.

### Category

Collection/model: `Category` (`backend/src/catalog/models/category.ts`)

Fields: name, unique normalized slug, description, status (`active|archived`), integer `sortOrder`, timestamps.

### Inventory

Collection/model: `Inventory` (`backend/src/catalog/models/inventory.ts`)

Stores product stock such as `onHand`, `reserved`, and adjustment metadata. Available stock is calculated as `onHand - reserved`. Reservations and adjustments use atomic conditional operations to prevent negative available stock.

### Order

Collection/model: `Order` (`backend/src/order/models/order.ts`)

Order records contain:

- unique human-facing `orderNumber` and database ID;
- authenticated `userId`;
- product item snapshots: product ID/slug/name, quantity, unit price, line total;
- integer USD totals: subtotal, discount, shipping, tax, total;
- immutable shipping-address snapshot;
- legacy display fields and canonical `order_status`;
- payment, preparation, delivery, order, and fulfillment status fields;
- DHL tracking snapshot;
- status history with phase, status, timestamp, actor, and reason;
- stock reservation state and expiry;
- payment attempt references where applicable;
- idempotency reference and timestamps.

The order snapshot must not change when catalog or profile records later change.

### Canonical order status

The canonical object is:

```js
order_status: {
  payment: 'awaiting_payment', // awaiting_payment | confirmed | failed | refunded
  prep: 'pending',             // pending | being_prepared | prepared
  delivery: 'pending',         // pending | processing | delivered
  tracking: {
    carrier: null,
    tracking_id: null,
    tracking_url: null,
    handover_at: null,
    shipped_at: null
  }
}
```

Legacy order/payment/preparation/delivery fields still exist for compatibility. `backend/src/order/status.ts` normalizes canonical and legacy values for display and migration compatibility. Do not introduce another order status object without first updating the normalizer, admin service, customer display, and tests.

### Payment

Collection/model: `Payment` (`backend/src/payment/model.ts`)

Stores `orderId`, `userId`, provider (`razorpay`), mode (`test`), provider order/payment IDs, amount/currency, provider status, signature verification flag, idempotency key, webhook event IDs, safe metadata, expiry, claim time, and paid time. Unique indexes prevent duplicate user/idempotency and provider IDs.

### Review

Collection/model: `Review` (`backend/src/review/model.ts`)

Fields: product reference, optional user reference, public author name, internal source (`customer|customer_customer`), rating 1–5, title, body, status (`pending|published|rejected`), `isFeatured`, `isStrip`, timestamps. Admin-created reviews may use the customer-facing source value, but source should not be exposed in public review API responses.

### Contact message and newsletter

`ContactMessage` requires an authenticated `userId`, name, email, topic, message, and timestamps. `NewsletterSubscriber` stores a normalized unique email and timestamps. There is no outbound email implementation; admins can view records only.

### Store settings and audit logs

`StoreSettings` stores USD currency, shipping minor units, tax percentage, and site image overrides. `AuditLog` records actor, action, entity type/ID, request ID, timestamp, and sanitized changes. Audit logging must not include secrets or unnecessary personal information. Sensitive admin actions are intended to fail closed if audit persistence fails.

## 7. Public and customer API

All paths below are relative to `/api/v1`.

### Health and catalog

```text
GET /health
GET /catalog/products
GET /catalog/products/:slug
GET /catalog/categories
GET /catalog/products/:slug/reviews
GET /catalog/products/reviews/strip
```

Public catalog reads expose active products and safe public fields only. Product prices are backend-calculated. The review strip returns only published/approved strip reviews and is displayed as a looping link strip on the storefront.

### Account and addresses

```text
PATCH /account/profile
GET   /account/addresses
POST  /account/addresses
PATCH /account/addresses/:addressId
DELETE /account/addresses/:addressId
POST  /account/addresses/:addressId/default
```

All require customer authentication. Mutations also require CSRF. Address line 2 is optional in the address collection and forms.

### Cart

```text
GET    /cart
POST   /cart/items
PATCH  /cart/items/:productId
DELETE /cart/items/:productId
DELETE /cart
POST   /cart/merge
```

The backend validates product existence, active status, quantity limits, and inventory availability. Guest localStorage cart data is reduced to product IDs and quantities before merge; browser prices/totals are ignored. Duplicate product lines are merged deterministically and capped.

### Orders

```text
GET  /orders
GET  /orders/:orderId
POST /orders
```

Order creation accepts only an owned `addressId` and requires an `Idempotency-Key`. It reads the server cart, re-reads products/settings/inventory/address, calculates all totals in minor units, reserves stock, creates a pending-payment order, and clears the cart after successful order creation. It does not trust browser prices, totals, stock, payment status, or discounts.

Current payment-failure design keeps internal failed/expired order records for audit/admin troubleshooting and exposes a customer-facing unpaid/payment-issues section separately from paid order history. Failed/expired payment handling restores cart quantities where stock remains available.

### Payments

```text
POST /payments/razorpay/order
POST /payments/razorpay/verify
GET  /payments/razorpay/:orderId/status
POST /payments/razorpay/abandon
POST /webhooks/razorpay
```

Flow:

1. Customer creates an internal pending-payment order.
2. Frontend asks backend to create a Razorpay order using the internal order ID and idempotency key.
3. Backend sends the trusted total to Razorpay; the browser never chooses the amount.
4. Razorpay Checkout runs in the browser.
5. Frontend sends Razorpay IDs/signature to `/verify`.
6. Backend verifies the signature and fetches provider state before marking payment confirmed/captured.
7. Webhook verification is an independent recovery path. The webhook uses the raw request body and `x-razorpay-signature`, verifies HMAC, deduplicates event IDs, and handles captured/failed/refunded events without stale regressions.
8. Successful payment consumes the stock reservation and decrements stock. Failed/expired payment releases reservation and restores cart availability.

Razorpay Test Mode may display a minimum USD checkout amount of $1. The backend should reject totals below the provider minimum before reserving stock or creating the provider order; this rule is a business/provider constraint, not a frontend-only validation.

## 8. Admin API

All admin routes except login require an active admin session. All admin mutations require CSRF.

```text
POST /admin/auth/login
GET  /admin/auth/me
GET  /admin/auth/csrf
POST /admin/auth/logout
GET  /admin/audit-logs

GET   /admin/catalog/products
POST  /admin/catalog/products
PATCH /admin/catalog/products/:productId
GET   /admin/catalog/categories
POST  /admin/catalog/categories
PATCH /admin/catalog/categories/:categoryId
GET   /admin/catalog/inventory
PATCH /admin/catalog/inventory/:productId/adjust
GET   /admin/catalog/assets
POST  /admin/catalog/assets/upload
GET   /admin/catalog/site-images
PATCH /admin/catalog/site-images

GET   /admin/orders
GET   /admin/orders/:orderId
PATCH /admin/orders/:orderId/status
PATCH /admin/orders/:orderId/shipment
PATCH /admin/orders/:orderId/cancel

GET   /admin/users
GET   /admin/users/:userId
PATCH /admin/users/:userId

GET    /admin/reviews
POST   /admin/reviews/demo
PATCH  /admin/reviews/:reviewId
DELETE /admin/reviews/:reviewId

GET    /admin/contact
GET    /admin/contact/newsletter
DELETE /admin/contact/:messageId
DELETE /admin/contact/newsletter/:subscriberId
```

Admin catalog supports search/filter/pagination, product create/edit/archive, category management, approved image references, and inventory adjustments with required reasons. Product deletion is archival, not physical database deletion.

Admin orders support search/filter/pagination, customer/order detail, status updates, cancellation, and manual DHL tracking. Payment cannot be marked confirmed by a generic admin status click; trusted verification controls payment. DHL tracking requires approved HTTPS DHL URL/domain and the appropriate prepared/processing workflow.

## 9. Order status behavior

The intended phase order is payment → preparation → delivery.

```text
Payment:
  awaiting_payment → confirmed | failed | refunded

Preparation:
  pending → being_prepared → prepared

Delivery:
  pending → processing → delivered
```

Payment confirmation is provider/server controlled. Admins can manage preparation and delivery according to backend transition rules. When a later phase is set, the status service may normalize earlier phase state to its completed equivalent, but this must remain centralized in `backend/src/order/status.ts` and `backend/src/order/admin-service.ts`.

The customer order page reads persisted backend status, renders the three phases, highlights the current phase, shows dates from status history, and shows DHL tracking after it is saved. It must not simulate progress locally.

## 10. Security and data-integrity rules for future changes

1. Never trust user ID, role, prices, discounts, totals, stock, payment state, or order ownership from the browser.
2. Derive user identity from the authenticated session.
3. Enforce ownership in the query itself, not only in frontend code.
4. Use Zod validation at request boundaries and safe consistent errors.
5. Require CSRF for cookie-authenticated state changes.
6. Keep secrets server-only and do not print `.env` values.
7. Preserve historical order snapshots.
8. Use integer minor units for money.
9. Use idempotency for order/payment retries.
10. Use atomic inventory updates or transactions for stock-sensitive operations.
11. Treat Razorpay webhooks as untrusted until HMAC-verified.
12. Add an audit event for sensitive admin changes.
13. Do not add public admin registration.
14. Avoid destructive migrations and physical deletion of referenced products/orders.
15. Update tests whenever status, payment, auth, ownership, or pricing behavior changes.

## 11. Test and run commands

```powershell
# backend
cd backend
npm install
npm run dev
npm test
npm run typecheck
npm run build

# frontend, separate terminal
cd frontend
npm install
npm run dev
npm run build
```

Backend test areas already include authentication, account/address ownership, carts, orders, order status, admin order service, catalog, inventory, payments, webhooks, reviews, contact, and audit logging. Tests that require transactions need a transaction-capable MongoDB environment.

## 12. Safe working instructions for another AI

Before editing:

1. Read the relevant route, schema/model, service, repository, frontend caller, and tests.
2. Search every caller of the function or field being changed.
3. Keep the existing React/Vite, Express/TypeScript, Mongoose, Zod, and CSS conventions.
4. Prefer a small root-cause fix over parallel implementations.
5. Do not start a new phase or redesign unrelated storefront pages without explicit instruction.
6. Run the smallest relevant test first, then backend typecheck/build and frontend build when applicable.
7. Report changed files, tests, deployment requirements, and any migration/data-risk clearly.

Known operational note: the address collection allows an empty/omitted `addressLine2`, while the order shipping snapshot schema must also allow that optional field. If order creation returns a generic 500 for an address without line 2, inspect `backend/src/order/models/order.ts` before changing checkout logic.

