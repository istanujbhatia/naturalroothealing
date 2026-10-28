# AI Development Log

## Current state

- Phases 1-5 are substantially implemented.
- Phase 6 has the customer order foundation, pricing, snapshots, order history, and status tracking.
- Phase 10 adds Razorpay test-mode payment attempts, trusted verification, webhook handling, and payment-time inventory reservations. Live payment configuration and end-to-end provider testing remain pending.

## 2026-10-27

- Moved the React/Vite application into `frontend/` and kept the API in `backend/`.
- Added the supplied Natural Root Healing logo as the shared site logo.
- Added order-history pagination, order dates, phase dates, delivery/price dropdowns, and phase highlighting.
- Added persisted dark mode with a View Transition reveal and responsive profile access.
- Added root project documentation and moved the phase prompt into `docs/`.
- Implemented Phase 7 foundations: one-time Argon2id admin provisioning, role-specific admin sessions, protected admin routes, audit-log persistence with secret redaction, and audit-log access restricted to admins.
- Documented the provisioning command and fail-closed audit policy in `backend/README.md`.
- Implemented Phase 8 catalog foundations: active-only public catalog reads, protected admin product/category APIs with search and pagination, archive-based lifecycle, approved asset-reference validation, backend final-price calculation, separate inventory records, atomic non-negative stock adjustments, low-stock fields, and audit events for catalog/inventory changes.
- Closed Phase 8 audit gaps: fixed populated category responses, extracted inventory adjustment logic, added suspended-admin, snapshot-integrity, concurrency, pagination-boundary, and protected-route tests, and added the minimal admin catalog screen plus public catalog loading with fallback.
- Implemented Phase 9: protected admin order listing/detail/search/filter/pagination, centralized preparation/delivery/order transitions, payment-gated manual DHL tracking updates, safe DHL URL validation, order audit events, customer-owner tracking visibility, and a minimal `/admin/orders` screen.
- Verified: frontend production build, backend tests (41 passing), backend typecheck, and backend production build.

## 2026-10-28 — Phase 10

- Added a separate `Payment` model supporting multiple Razorpay test-mode attempts per order, provider identifiers, expected amount/currency, signature state, expiry, webhook event IDs, and safe metadata only.
- Added backend-only Razorpay order creation, checkout signature verification plus provider-state retrieval, owner-only payment status recovery, and HMAC-verified webhook handling for captured, failed, and confirmed-refund events.
- Added 30-minute stock reservations at order creation when inventory records exist. Expired, failed, and explicitly cancelled reservations are released; a server worker checks expiry every minute.
- Preserved the canonical `order_status` structure and kept payment, cancellation, preparation, and delivery state separate. Stale failure/refund events cannot regress a confirmed/refunded payment.
- Integrated the existing checkout with server-created Razorpay test orders and backend verification. Checkout dismissal does not claim success or final payment failure.
- Added admin read-only payment-attempt visibility and documented environment variables, webhook setup, and the owner payment-status endpoint in `backend/README.md`.
- Remediated reservation/payment races with transaction-backed `reserved -> consumed/released` settlement, fail-closed payment-initiation locking, correct `refund.processed` payment association, full-refund validation, bounded expiry batches, and targeted webhook-association tests.
- Verified: backend tests (60 passing), backend typecheck/build, and frontend production build. Real Razorpay test-mode checkout was not run because provider credentials and webhook setup are external configuration.
