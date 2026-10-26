# Natural Root Healing — Integrated AI Development Prompt Pack
## Existing storefront + MongoDB database + secure backend + customer accounts + admin portal + DHL tracking + Razorpay

This prompt pack combines the two supplied Natural Root Healing guides into one implementation sequence. Use it with your coding AI one phase at a time. Do not paste every phase into the coding AI at once.

---

# How to use this pack

1. Open the existing Natural Root Healing repository in your coding AI.
2. Paste the **Master Instruction** first.
3. Paste **Phase 0** and review its audit before allowing code changes.
4. After each phase, run the completion-review prompt, verify the results yourself, and approve the next phase explicitly.
5. Keep the phase log file updated and share the latest log with ChatGPT whenever you want help choosing the next phase or troubleshooting.

**Important:** The current storefront is React + Vite + JavaScript. The target is to preserve it and add a Node.js + Express + TypeScript backend with MongoDB Atlas + Mongoose. Migrate frontend code to TypeScript only incrementally when justified. Do not migrate to Next.js or redesign the site as part of this work.

## Integrated phase sequence

| Phase | Main outcome |
|---|---|
| 0 | Repository audit, baseline tests, safe checkpoint |
| 1 | Backend foundation, configuration, MongoDB connection, health check |
| 2 | Product/category models, store settings foundation, idempotent catalog seed |
| 3 | Customer model and secure authentication |
| 4 | Customer profile and saved addresses |
| 5 | Persistent cart and guest-cart merging |
| 6 | Pricing, inventory, order creation, order history |
| 7 | Admin provisioning, server-side authorization, audit logging |
| 8 | Admin catalog/category/inventory management |
| 9 | Admin orders, customer support views, manual DHL tracking |
| 10 | Razorpay payment records and test-mode integration |
| 11 | Database hardening, end-to-end tests, deployment and launch readiness |

The database roadmap's DB Phases are incorporated into the broader application phases: inventory and store settings are built with checkout; audit logs with admin authorization; payment records with Razorpay; indexes, migrations and database testing are included in final hardening and also required throughout implementation.

---

# MASTER INSTRUCTION — paste once at the beginning

You are the senior full-stack engineer responsible for extending my existing Natural Root Healing e-commerce website into a secure, database-backed e-commerce application.

## A. Inspect before acting
- Inspect the actual repository, package files, source code, routes, components, assets, product data, cart implementation, checkout, account pages, and deployment configuration before making assumptions.
- Do not assume the repository matches an imagined folder structure.
- The existing website is a React + Vite + JavaScript storefront. Preserve its current design, content, routes, assets, responsiveness, and working behavior.
- Do not migrate to Next.js.
- Avoid broad rewrites, mass dependency upgrades, unrelated refactors, or unnecessary file moves.

## B. Target stack
- Frontend: existing React + Vite app; migrate to TypeScript incrementally only when useful and safe.
- Backend: Node.js + Express + TypeScript.
- Database: MongoDB Atlas + Mongoose.
- Authentication: implement a documented secure session or JWT strategy, including expiry, logout/revocation, cookie/token protection, and CSRF protection where applicable.
- Admin: protected `/admin` UI plus independently protected server-side admin APIs.
- Shipping: manual DHL tracking number and tracking URL entry initially.
- Payments: Razorpay test mode only after backend pricing, inventory, and order creation are reliable.

## C. Required customer functionality
Customers should eventually be able to:
- Browse products and categories served by the backend.
- Sign up, log in, log out, and retrieve their own account.
- Update their profile and manage saved delivery addresses.
- Add, remove, and update cart items.
- Keep their cart across sessions and devices when logged in.
- Place orders and see order history and order details.
- See order, payment, and fulfillment statuses separately.
- See admin-entered shipment tracking details for their own orders.

## D. Required admin functionality
Authorized administrators should eventually be able to:
- Sign in through a securely provisioned admin account.
- Create, update, publish, draft, and archive products and categories.
- Manage images or approved image references, prices, discounts, and stock.
- Search and filter orders and view relevant customer-support information.
- Process orders through valid status transitions.
- Enter courier, DHL tracking number, tracking URL, and shipment date.
- Review access-controlled administrative audit logs.

## E. Database collections and relationships
Use separate collections for the data entities that change independently. Expected collections:
- `users`
- `products`
- `categories`
- `addresses`
- `carts`
- `orders`
- `inventory` if a separate inventory model is chosen
- `payments`
- `storeSettings`
- `auditLogs`

Use references for independently changing entities. Do not embed an unbounded history of every order or every cart item in a user document. Orders must store historical product, price, SKU where applicable, and shipping-address snapshots so later changes do not rewrite history.

## F. Security and business rules — mandatory
- The backend is the source of truth for prices, discounts, totals, shipping, taxes, stock, order ownership, payment status, and admin permissions.
- The browser may submit product IDs, quantities, and a selected address ID, but must not set authoritative totals, discounts, shipping fees, tax, payment state, stock, user ID, or role.
- Recalculate prices from trusted database records at checkout and store immutable order snapshots.
- Never store plaintext passwords, raw card numbers, or CVVs.
- Never allow public signup to assign an admin role.
- Never trust a submitted `userId` to prove ownership. Derive the user identity from verified authentication.
- Enforce authentication, authorization, ownership checks, validation, and safe response shaping on the backend.
- Protect every admin API independently of frontend route guards.
- Keep backend secrets exclusively on the backend. Never put secrets in frontend code or `VITE_` variables.
- Use secure cookies/tokens, appropriate CSRF controls, strict CORS allowlisting, rate limiting, request validation, safe error handling, and logging redaction.
- Razorpay must use server-created provider orders, server-side signature verification, signed webhook verification, amount/currency/order association checks, idempotency, and explicit failure handling.
- Never mark an order paid based only on a frontend success response.
- Keep order status, payment status, and fulfillment status distinct.
- Do not expose password hashes, tokens, cookies, secrets, or unnecessary customer data.
- Do not invent store policies for taxes, shipping, discounts, refunds, cancellations, payment methods, or inventory reservation. Identify missing decisions and ask only the questions needed for the current phase.

## G. Development protocol for every phase
For each phase:
1. Inspect relevant code and dependencies.
2. State the plan, affected files, assumptions, and risks before implementation.
3. Implement only the requested phase.
4. Preserve existing behavior and visual design.
5. Add or update meaningful tests.
6. Run the available tests, type checks, lint checks, and production build as appropriate.
7. Review the Git diff for accidental changes, unrelated rewrites, and secret exposure.
8. Report exactly what changed, actual test results, manual steps, incomplete items, and known risks.
9. Update `docs/AI_DEVELOPMENT_LOG.md` with the phase, prompt/goal, files changed, decisions, commands actually run and results, outstanding issues, and recommended next phase.
10. Stop and wait for my approval before beginning the next phase.

Never claim a test passed unless it was actually executed. Do not perform destructive migrations, delete user work, modify production data, deploy, or initiate live payments without explicit approval.

A phase is complete only when its acceptance criteria pass or any unmet criteria are explicitly documented and approved as blockers.

Acknowledge these instructions, inspect the repository without changing code, and wait for my Phase 0 prompt.

---

# PHASE 0 — Repository audit and safe checkpoint

**Prompt to paste:**

Do not implement new features yet. Audit the existing Natural Root Healing repository and establish a safe baseline.

Inspect and report:
1. Actual folder structure, app entry points, routing, page components, shared components, CSS, assets, product/article data, and existing design conventions.
2. Existing shop, product detail, blog, account/profile, cart drawer, cart page, checkout, confirmation, policy, and contact pages.
3. Current cart behavior, including localStorage usage, bag count, quantity controls, removal, subtotal, shipping display, and guest-cart behavior.
4. Identify which features are real, local-only, mocked, visual-only, or not implemented.
5. `package.json`, lockfile, Node version, scripts, dependencies, build process, and deployment workflow.
6. Existing environment files, `.gitignore`, secret exposure risks, API URL assumptions, and hosting limitations.
7. Git branch, working-tree status, uncommitted changes, and recent relevant commits.
8. Run the existing build and existing tests, if available, without modifying source code.
9. Identify the minimal architecture for adding an Express API and MongoDB without redesigning or replacing the frontend.
10. Identify business decisions that must be clarified before pricing, inventory, shipping, tax, payment, cancellation, refund, and stock-reservation behavior can be implemented.

Do not delete files, run `git add .` blindly, overwrite uncommitted work, upgrade every dependency, reorganize the project, or modify deployment settings.

Deliver:
- Repository and architecture audit.
- Existing feature inventory.
- Baseline build/test results with exact commands.
- Risks and compatibility concerns.
- Suggested backend location and frontend/backend development workflow.
- A proposed phase plan aligned with the integrated phase sequence.
- A list of decisions that are genuinely blocking upcoming phases.

If the Git working tree is clean, recommend a checkpoint branch or commit. If there are changes, explain how to preserve them first. Do not create a commit unless I approve it.

Update `docs/AI_DEVELOPMENT_LOG.md` if creating documentation is safe, or tell me the exact suggested location and content if you should wait for approval.

Stop after the audit and wait for approval.

**Acceptance criteria:** The current site is understood, the baseline build status is known, existing work is protected, and no unapproved feature changes have been made.

---

# PHASE 1 — Backend foundation and MongoDB connection

**Prompt to paste:**

Implement Phase 1: establish the minimum backend foundation while preserving the existing storefront.

Requirements:
1. Choose a backend folder/location that minimizes unnecessary restructuring, based on the actual repository audit.
2. Set up Node.js, Express, and TypeScript for the backend, with development, build, and production start scripts.
3. Use compatible dependency versions and maintain the lockfile.
4. Add validated backend environment configuration for `PORT`, `MONGODB_URI`, allowed frontend origins, environment mode, and other settings that are actually needed.
5. Add a MongoDB Atlas connection module using Mongoose with clear startup and connection-failure behavior.
6. Add `GET /api/v1/health`. It should report API health and database connectivity appropriately without exposing credentials, connection strings, stack traces, or internal details.
7. Add centralized error handling, safe JSON body-size limits, request IDs, structured logging with redaction, and request-validation infrastructure.
8. Configure CORS using an explicit allowlist; do not use unrestricted origins with credentials.
9. Add appropriate baseline security middleware and rate-limiting infrastructure.
10. Update `.gitignore` safely for backend environment files, logs, builds, and generated files. Provide an example environment file with placeholders only.
11. Do not place backend secrets in frontend `VITE_` variables.
12. Do not implement product CRUD, authentication, admin operations, checkout, or payments yet.
13. Do not move frontend files unless strictly necessary and approved.
14. Document local setup commands and how to verify the health endpoint.

Test startup, missing/invalid configuration, database connection failures, health behavior, error responses, and production compilation. Clearly distinguish tests that were executed from checks that could not be run.

Stop after Phase 1.

**Acceptance criteria:** The backend starts reliably, connects to the configured MongoDB environment, the health endpoint works, configuration errors fail safely, and the existing frontend still builds.

---

# PHASE 2 — Product catalog, categories, store-settings foundation, and seed data

**Prompt to paste:**

Implement Phase 2: create the database-backed catalog foundation using the real product/category data in the current Natural Root Healing repository.

## Product model
Include validated fields appropriate to the current catalog:
- name, slug, description and existing product details
- category reference
- image URLs/asset references and alt text
- currency and price representation
- list/actual price and a documented discount representation
- backend-calculated final selling price
- status such as `draft`, `active`, or `archived`
- SKU or variants only if supported by the existing catalog or approved business requirements
- timestamps

## Category model
Include name, slug, description, status, sort order, and timestamps as appropriate.

## Requirements
1. Inspect actual product/category data and migrate only what exists. Do not invent products, images, ingredients, medical/health claims, or product copy.
2. Use integer minor units for money to avoid floating-point errors; for example, INR 1299.00 is represented as 129900 paise.
3. Do not assume a discount is always a fixed amount or percentage. Document the selected representation and ask for approval if the existing data/business rule is ambiguous.
4. Calculate the final price on the backend from trusted fields. Do not trust a client-submitted final price.
5. Validate negative prices, invalid discounts, duplicate slugs, invalid categories, malformed image references, and stock fields if present.
6. Add indexes for unique slugs and frequently queried catalog fields where justified.
7. Create an idempotent seed script. Running it repeatedly must not duplicate records or overwrite intentional admin edits unexpectedly.
8. Preserve product slugs, descriptions, image paths, and content. Use archival rather than destructive deletion where historical records may reference a product.
9. Add a minimal `storeSettings` foundation only for settings that are known. Do not invent shipping fees, free-shipping thresholds, taxes, or currency policy. Use explicit placeholders or document what needs a decision.
10. Add model/service tests for validation, price calculation, duplicate slugs, invalid category references, and seed reruns.
11. Do not connect the frontend to the database yet.
12. Do not build admin CRUD in this phase.

Deliver model design, seed command, representative sanitized sample documents, tests, and manual verification steps. Stop after Phase 2.

**Acceptance criteria:** Existing catalog data can be seeded safely into MongoDB, rerunning the seed does not create duplicates, invalid data is rejected, and no business rules or product content were invented.

---

# PHASE 3 — User model and customer authentication

**Prompt to paste:**

Implement Phase 3: customer authentication using the existing backend foundation.

## User model
Include name, normalized unique email, password hash, phone if needed, server-controlled role, account status, optional email-verification state, and timestamps. Keep addresses, carts, orders, and payments in separate collections.

## Authentication requirements
1. Implement signup, login, logout, authenticated-user retrieval, and the agreed expiry/revocation behavior.
2. Hash passwords with Argon2id or another appropriately configured password-hashing algorithm. Never store plaintext passwords.
3. Ensure password hashes are excluded from ordinary queries where practical and are never returned in API responses.
4. Normalize email addresses and enforce uniqueness with a database index; handle duplicate-registration races safely.
5. Public registration must always create a customer. Reject or ignore client-submitted roles; never provide public admin registration.
6. Choose and document a suitable session/JWT architecture based on the existing hosting and frontend/backend deployment. Explain expiry, refresh or renewal, logout/revocation, cookie settings, and CSRF controls where applicable.
7. Prefer secure HttpOnly cookies where suitable. Configure `Secure`, `SameSite`, domain, and credentialed CORS behavior deliberately for the actual deployment.
8. Add rate limits to login, signup, and any password-recovery endpoints that are implemented.
9. Validate inputs and return safe, consistent errors without leaking account internals.
10. Return a deliberately shaped safe user object, never a raw database document.
11. Add tests for signup, login, wrong password, duplicate email, invalid inputs, expired credentials, logout, role escalation, and safe responses.
12. Do not implement public password-reset/email-verification flows unless requirements and delivery mechanisms are established; document them as pending if needed.
13. Do not implement admin provisioning or payment functionality yet.

Connect only the minimum frontend authentication UI needed if this phase explicitly requires it; preserve the existing visual design and avoid redesigning unrelated pages. If frontend integration is safer as a separate small step, explain why before doing it.

Stop after this phase.

**Acceptance criteria:** A customer can register, log in, log out, and retrieve their own authenticated identity safely. Public requests cannot create admin accounts.

---

# PHASE 4 — Customer profile and saved delivery addresses

**Prompt to paste:**

Implement Phase 4: persistent customer profile and address management.

Create an `Address` model linked to the user with fields appropriate to delivery: recipient name, phone, address lines, city, state/region, postal code, country, default-address status, and timestamps.

Requirements:
1. Allow authenticated customers to view/update permitted profile fields.
2. Allow customers to create, list, update, delete, and select a default delivery address.
3. Derive the owner from verified authentication, never from an arbitrary `userId` supplied by the browser.
4. Enforce address ownership on every read and mutation. Test attempts to access another customer's address.
5. Validate fields without hardcoding Indian postal formats if international addresses may be supported.
6. Implement a consistent default-address rule so a customer does not unintentionally have multiple defaults.
7. Keep address documents separate from orders. When an order is created later, it must copy an immutable shipping-address snapshot.
8. Avoid logging unnecessary phone/address details.
9. Connect the existing account/profile UI and address forms to the API while preserving styling and responsive behavior.
10. Add loading, validation, empty, success, and error states.
11. Test profile updates, address CRUD, ownership, invalid data, and default-address changes.
12. Do not implement checkout or order creation yet.

Stop after Phase 4.

**Acceptance criteria:** Profile and addresses persist in MongoDB, customers can manage their own addresses, and cross-user access is blocked.

---

# PHASE 5 — Persistent cart and guest-cart merge

**Prompt to paste:**

Implement Phase 5: replace the local-only cart source of truth with a backend-backed cart for authenticated customers while preserving the current cart UI.

Create a `Cart` model with a user reference, product references, quantities, and timestamps. Use one cart per authenticated customer for the initial version unless the repository or requirements justify another design.

Requirements:
1. Store product IDs and quantities, not trusted prices, discounts, or totals.
2. Implement API operations to retrieve the cart, add an item, update quantity, remove an item, and clear the cart.
3. Enforce authentication and cart ownership on all operations.
4. Validate product existence, active status, quantity limits, and availability.
5. Return current product details and backend-calculated display totals. Treat displayed cart totals as estimates, not a price guarantee.
6. Revalidate prices, discounts, stock, shipping, and applicable rules at checkout.
7. Preserve guest-cart behavior if the existing website uses localStorage.
8. On login, merge only guest product IDs and quantities into the authenticated cart after validating all items against MongoDB. Ignore guest prices, discounts, and totals.
9. Prevent duplicate entries for the same product and define a deterministic quantity-merge rule.
10. Handle archived/deleted products, changed prices, invalid product IDs, and unavailable stock gracefully.
11. Connect existing cart page, bag drawer, header count, quantity controls, remove actions, and clear-cart behavior without redesigning the storefront.
12. Make the UI resilient to API loading, network failure, empty cart, and expired sessions.
13. Test reload persistence, multiple-session behavior, login/logout, guest-cart merge, price tampering, unavailable products, quantity limits, and cross-account access.
14. Do not create orders or payment requests in this phase.

Stop after Phase 5.

**Acceptance criteria:** Logged-in cart contents persist across sessions, the existing cart UI still works, and browser edits cannot change authoritative prices.

---

# PHASE 6 — Trusted pricing, inventory, store rules, order creation, and order history

**Prompt to paste:**

Implement Phase 6: the secure checkout foundation without a payment gateway. This phase includes the database roadmap's orders, inventory, and store-settings responsibilities.

## Models and services
Create or refine:
- `Order`
- order-item snapshot structure
- `Inventory` or the approved product-level stock model
- `StoreSettings` for approved currency/shipping/tax/discount rules
- pricing calculation service
- order-creation service
- order-status transition service
- idempotency or duplicate-submission protection

## Order data
Each order should include:
- unique order number
- authenticated user reference
- product/variant identifiers where applicable
- historical product name and SKU snapshots
- quantity, unit price, line total
- currency, subtotal, discounts, shipping, tax, and final total
- immutable shipping-address snapshot
- separate order, payment, and fulfillment statuses
- timestamps and any necessary idempotency reference

## Requirements
1. The backend is the only authority for prices, discounts, shipping, tax, totals, inventory, and payment status.
2. The browser may send product identifiers, quantities, and a selected address ID, but not authoritative prices, discounts, shipping, taxes, totals, stock values, or payment status.
3. Read cart items from trusted storage and re-read current product status, pricing, discount rules, address ownership, and inventory at checkout.
4. Calculate every line total and the full order total using integer minor units and approved rules.
5. Do not invent shipping, tax, currency, cancellation, refund, or discount policy. Ask for approval for decisions that materially affect charges.
6. Copy product names, SKU, unit prices, quantities, line totals, and delivery details into order snapshots. Later catalog/profile edits must not rewrite existing orders.
7. Generate unique order numbers safely.
8. Prevent duplicate orders from repeated submissions, retries, and network timeouts using an appropriate idempotency strategy.
9. Choose and document the stock strategy: reserve stock at order creation, decrement immediately, or another approved approach. Define how failures, cancellations, and returns release/restore stock.
10. Use MongoDB transactions when supported by the actual deployment. If transactions are unavailable, implement a documented consistency/recovery strategy rather than assuming multiple writes are atomic.
11. Protect against concurrent checkout and stock overselling with atomic conditional updates or a transaction-based strategy.
12. Clear the cart only after successful order creation according to the agreed workflow. Provide a recovery path for partial failures.
13. Implement authenticated customer order history and order details restricted to the order owner.
14. Define valid order-status transitions and keep order status, payment status, and fulfillment status separate.
15. Orders should begin in a documented pending-payment state unless an explicitly approved payment method supports another flow. Do not mark an order paid based on browser claims.
16. Add tests for price tampering, invalid discounts, shipping/tax calculations, invalid/foreign addresses, duplicate submissions, insufficient stock, concurrent purchases, partial failure, ownership, and historical snapshots.
17. Use sanitized test data only.

Example calculation for testing only: if a product is ₹1,499, the approved discount is ₹200, quantity is 2, and approved shipping is ₹99, the server-calculated total is (1499 - 200) × 2 + 99 = ₹2,697. These are illustrative values, not store policy.

Do not integrate Razorpay yet. Stop after Phase 6.

**Acceptance criteria:** The backend creates accurate orders with historical snapshots, rejects client price tampering, prevents or safely handles overselling, and supports customer-only order history without any payment gateway.

---

# PHASE 7 — Admin provisioning, authorization, and audit logging

**Prompt to paste:**

Implement Phase 7: establish secure administrative access and audit logging before building administrative business operations.

Requirements:
1. Reuse the established authentication infrastructure but enforce explicit server-side admin authorization.
2. Implement a controlled initial administrator provisioning method, such as a documented one-time seed/CLI script. Do not expose a public admin-registration endpoint.
3. Never trust a role or user ID sent by the browser. Verify account status and role on the server for every admin request.
4. Protect all `/api/v1/admin/*` endpoints independently of frontend route guards.
5. Use safe `401` and `403` responses without exposing internals.
6. Apply appropriate rate limits, session/token protections, validation, and logging redaction.
7. Create an `AuditLog` model/service recording actor, action, entity type/ID, timestamp, request ID, and relevant before/after changes where appropriate.
8. Never log passwords, hashes, tokens, cookies, secret values, raw payment secrets, or unnecessary personal data.
9. Restrict audit-log access to authorized admin roles.
10. Define which events should be logged: product price/status changes, inventory adjustments, order status updates, shipment tracking changes, admin account/security changes, and other sensitive actions.
11. Ensure audit logging failures are handled deliberately for sensitive actions; document whether the operation should fail closed or use another reliable mechanism.
12. Create a minimal protected admin layout/login route if necessary, matching the existing visual system. A hidden route alone is not security.
13. Test customer access to admin APIs, unauthenticated access, expired sessions, role escalation, disabled admin accounts, provisioning, and audit events.
14. Do not implement product or order management yet.

Stop after Phase 7.

**Acceptance criteria:** Only provisioned, authorized administrators can access admin APIs, and important administrative actions are recorded without leaking secrets or unnecessary personal data.

---

# PHASE 8 — Admin product, category, image, and inventory management

**Prompt to paste:**

Implement Phase 8: secure admin catalog and inventory management using the models and authorization from previous phases.

Admin features:
- Product listing, search, filtering, and pagination.
- Create/edit product details and approved image references.
- Set list/actual prices and approved discount rules.
- View backend-calculated final selling price.
- Change publication status between draft, active, and archived.
- Manage categories and sort order.
- View stock, available stock, and low-stock alerts.
- Make controlled inventory adjustments with reasons.

Requirements:
1. Implement protected admin APIs for catalog/category operations and enforce server-side admin authorization on every mutation.
2. Validate all fields, relationships, prices, discounts, slugs, images, and stock values.
3. Calculate final prices on the backend.
4. Prevent negative prices, invalid discounts, duplicate slugs, and negative inventory.
5. Use safe image upload/storage if a real upload service has been approved. Otherwise validate approved existing asset references; do not invent an upload provider or expose storage secrets.
6. Prefer archival over permanent deletion where orders reference a product/category.
7. Preserve historical order snapshots when current catalog data changes.
8. Log price changes, product publication/status changes, category changes, and inventory adjustments in audit logs.
9. Add pagination, search, loading, validation, empty, success, and error states.
10. Ensure public catalog endpoints expose only active products and safe public fields.
11. Test unauthorized mutations, invalid prices, concurrency, archival, historical-order integrity, and product visibility.
12. Preserve the current customer storefront; do not redesign it.

Stop after Phase 8.

**Acceptance criteria:** Authorized admins can safely manage catalog and stock, public users cannot mutate catalog data, and historical orders remain accurate.

---

# PHASE 9 — Admin orders, customer-support views, and manual DHL tracking

**Prompt to paste:**

Implement Phase 9: order operations, minimal customer-support views, and manual DHL shipment tracking.

## Admin order dashboard
Provide:
- New/unfulfilled, processing, fulfilled, and other relevant order views.
- Search/filter by order number, date, customer identifier/contact where appropriate, and status.
- Order details including item snapshots, historical prices, address snapshot, and relevant customer contact information.
- Relevant customer profile, order history, and current cart information only where needed for legitimate support.

## Order operations
1. Enforce server-side admin authorization on every endpoint and action.
2. Validate order-status and fulfillment-status transitions through a centralized service.
3. Keep order status, payment status, and fulfillment status distinct.
4. Do not let a generic manual order edit mark an order paid unless an explicitly configured and approved manual-payment workflow exists.
5. Record important changes in audit logs, including actor, previous/new state, timestamp, and reason where appropriate.
6. Never expose password hashes, authentication tokens, or unnecessary sensitive data.
7. Apply pagination and limit customer data returned by list endpoints.

## DHL tracking
1. Allow authorized admins to enter courier, tracking number, tracking URL, and shipment date.
2. Validate tracking values and allow only approved URL formats/domains. Avoid open-redirect behavior and unsafe URLs.
3. Display saved tracking details in the customer's own order detail view.
4. Restrict shipment details to the order owner and authorized administrators.
5. This phase stores admin-entered tracking information only. Do not claim to retrieve live DHL tracking events or integrate a courier API.
6. Define fulfillment eligibility based on the approved payment/manual-payment policy.
7. Test invalid URLs, missing data, unauthorized updates, customer access restrictions, state transitions, and audit logging.
8. Preserve the existing storefront design and use its established component patterns.

Stop after Phase 9.

**Acceptance criteria:** Admins can find and process orders through valid transitions, enter DHL tracking information, and customers can see tracking information only for their own orders.

---

# PHASE 10 — Payment records and Razorpay test-mode integration

**Prompt to paste:**

Implement Phase 10 only after the trusted pricing, inventory, and order workflow passes its tests. Integrate Razorpay in test mode only.

## Payment model
Create a separate `Payment` collection/model so one order can have multiple payment attempts. Include order/user references as appropriate, provider, provider order/payment IDs, amount in minor units, currency, payment status, relevant safe metadata, timestamps, and idempotency/webhook references. Never store card numbers or CVVs.

## Requirements
1. Identify the exact merchant configuration and webhook settings required. Do not ask me to paste secrets into source code or commit them to Git.
2. Keep Razorpay secret credentials exclusively on the backend.
3. Create Razorpay provider orders using the trusted backend order total and currency. Never accept arbitrary frontend amount/currency values.
4. Return only the public checkout configuration the frontend requires.
5. Implement server-side verification of the checkout signature.
6. Implement webhook signature verification using the raw request body as required by the provider's documented mechanism.
7. Verify payment status, amount, currency, provider order association, and internal order association before marking an order paid.
8. Process webhooks idempotently. Duplicate or out-of-order events must not double-process payments or cause invalid status transitions.
9. Handle pending, successful, failed, cancelled, and refunded states according to provider capabilities and the approved store policy.
10. Keep payment state separate from fulfillment state.
11. Ensure fulfillment only proceeds when the configured verified-payment or approved manual-payment policy allows it.
12. Do not expose secrets in logs, API responses, frontend bundles, or error messages.
13. Test invalid signatures, amount/currency mismatch, incorrect order association, duplicate webhook delivery, retries, failed payments, and repeated checkout submissions.
14. Use Razorpay test mode only. Do not initiate live transactions, use production credentials, or switch to live mode without explicit approval.
15. Document environment variable names using placeholders, webhook setup, and a safe manual test plan.

Stop after Phase 10.

**Acceptance criteria:** Test-mode payment attempts are recorded separately, and only a verified server-side payment workflow can update the order's payment status.

---

# PHASE 11 — Database hardening, integration tests, deployment readiness, and launch review

**Prompt to paste:**

Implement Phase 11: review the whole application for data integrity, security, frontend regression, operational reliability, and deployment readiness. Do not deploy or modify production data.

## Database review
1. Review every Mongoose schema, relationship, validation rule, index, and query pattern.
2. Verify unique indexes for normalized email, product/category slugs, order numbers, provider references, idempotency keys, and other required unique identifiers.
3. Verify indexes for customer order history, cart lookup, active catalog queries, and admin unfulfilled-order views.
4. Confirm indexes actually exist in the target environment; do not assume schema declarations prove deployment correctness.
5. Review payment webhook idempotency and duplicate-event handling.
6. Document versioned migration/seed procedures and rollback limitations.
7. Verify development, test, staging, and production environment separation.
8. Document MongoDB access restrictions, backup schedules, recovery procedures, and a restoration test plan.
9. Verify transaction assumptions against the actual MongoDB deployment topology.

## Security and business-flow tests
Test:
- Signup/login/logout/session expiry and role escalation.
- Profile/address ownership and cross-customer isolation.
- Persistent cart and guest-cart merging.
- Price, discount, shipping, tax, and total tampering.
- Duplicate order requests and idempotency.
- Historical product/address snapshots.
- Concurrent inventory changes, insufficient stock, cancellations, and recovery paths.
- Admin authorization and direct API access attempts.
- Customer-data minimization and access restrictions.
- Order/payment/fulfillment status transitions.
- DHL tracking URL validation and ownership.
- Razorpay signature checks, webhook verification, amount/currency validation, and duplicate events where configured.
- CORS, rate limits, input validation, safe errors, and logging redaction.

## Frontend regression
1. Verify existing routes, styling, assets, responsive behavior, search, navigation, product pages, blog, policy pages, and contact page.
2. Verify account, addresses, cart, checkout, order confirmation, order history, and admin pages.
3. Verify loading, empty, success, validation, expired-session, network-error, and unavailable-product states.
4. Ensure the confirmation page never claims an order/payment succeeded without backend confirmation.
5. Check keyboard navigation, form labels, accessible error messages, and basic accessibility regressions.

## Deployment readiness
1. Document frontend/backend deployment architecture and required build/start commands.
2. Verify production API URL configuration, HTTPS, CORS, cookie settings, domains, and environment configuration.
3. Review current hosting constraints, including whether static hosting can run the backend or whether the API must be deployed separately.
4. Confirm no secrets are committed or exposed in frontend bundles or source maps.
5. Document MongoDB network access, least-privilege database users, backup/recovery, monitoring, and secure admin provisioning.
6. Provide rollback instructions and a launch checklist.
7. Do not deploy, modify production data, run destructive migrations, or enable live payments without explicit approval.

Deliver a final report with:
- Features implemented and verified.
- Exact commands executed and actual results.
- Tests that passed, failed, were skipped, or could not run.
- Security findings ranked by severity.
- Database indexes, migrations, backup/recovery status.
- Deployment instructions and required manual setup.
- Known limitations and remaining tasks ranked by severity.
- A clear go/no-go recommendation. Do not call the application production-ready if critical risks remain.

Update the development log and stop.

**Acceptance criteria:** There is a reproducible test/deployment plan, key database and security assumptions are verified, regressions are checked, and all remaining risks are documented honestly.

---

# REUSABLE COMPLETION REVIEW — run after every phase

Before moving to the next phase, perform a completion review of the current phase only.

1. List every file created, modified, or deleted and explain why.
2. Explain what was implemented and how the main flows work.
3. Run the relevant automated tests, type checks, lint checks, and build commands that are available. Show exact commands and actual output summaries.
4. Clearly label tests not run and explain why. Do not claim success without execution.
5. Check for regressions in the existing storefront and previously completed phases.
6. Review the Git diff for accidental changes, unrelated refactors, exposed secrets, unsafe configuration, and unexpected generated files.
7. Review security boundaries, especially server-side authorization, ownership checks, pricing authority, payment state, and data minimization where relevant to this phase.
8. List unmet acceptance criteria, known defects, assumptions, manual setup, and decisions requiring my approval.
9. Provide a practical manual verification checklist.
10. State whether the phase is complete, partially complete, or blocked, and justify that status.
11. Update `docs/AI_DEVELOPMENT_LOG.md` with the phase name/number, goal, files changed, architecture decisions, commands/tests and results, issues, approvals needed, and recommended next phase.
12. Do not begin the next phase automatically. Wait for my explicit approval.

---

# LOGGING REQUIREMENT — include this at the end of every phase prompt

At the end of this phase, update `docs/AI_DEVELOPMENT_LOG.md` with a concise, factual record of:
- The exact phase completed and the objective of the prompt.
- Files created, modified, or deleted.
- Key implementation decisions and any assumptions.
- Commands actually executed and their results.
- Tests that passed, failed, were skipped, or could not run.
- Manual configuration steps completed or still required.
- Known issues, incomplete acceptance criteria, security concerns, and unresolved business decisions.
- The next recommended phase, without starting it.

Keep this log cumulative and append a dated entry rather than replacing previous entries. Do not include credentials, tokens, private customer data, or other secrets in the log. At the end of your response, provide the log file path and a concise summary of the new entry so I can share the log with ChatGPT. If the log cannot be created or updated, explain why and provide the exact text that should be added.

---

# Suggested workflow

1. Paste the Master Instruction once.
2. Paste Phase 0. Review the audit and approve the checkpoint plan.
3. Paste one phase prompt at a time.
4. Run the Reusable Completion Review after each phase.
5. Review the changed files and test the app yourself before approving the next phase.
6. Share `docs/AI_DEVELOPMENT_LOG.md` with ChatGPT when you need help diagnosing issues or choosing the next prompt.
7. Do not proceed past a blocked phase by asking the AI to build later features around an unverified foundation.
8. Keep Razorpay in test mode until the complete payment workflow is verified and you explicitly approve production activation.

## First milestone to aim for
The first useful milestone is not the whole e-commerce system. It is:
- The current storefront still looks and behaves correctly.
- The Express backend starts and connects to MongoDB.
- The existing products and categories are safely stored in MongoDB.
- The public catalog can later be switched to database-backed API responses in a controlled step.
- No payment or admin complexity is introduced before the foundation is stable.
