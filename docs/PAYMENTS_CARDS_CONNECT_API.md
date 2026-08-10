# Payments — Saved Cards, Charges & Connect Payouts

## Overview

This feature lets a user save a card via Stripe, charge that saved card (optionally on behalf of a payee/brand), and lets payees onboard to Stripe Connect to later receive their share as a transfer. It follows Stripe's **"separate charges and transfers"** pattern:

1. The platform's Stripe account always receives the full charge first.
2. If the payment has a `payeeUserId`, a `platformFeeAmount` is deducted and the rest (`payeeAmount`) is recorded as owed to the payee.
3. An **admin** later triggers a real Stripe `Transfer` to move `payeeAmount` into the payee's connected account — this never happens automatically.

**Base URL:** `/payments/*` and `/webhook/stripe`
**Auth:** All `/payments/*` endpoints require `Bearer <JWT>` except `GET /payments/connect/return` and `GET /payments/connect/refresh` (public, browser-facing). `POST /payments/connect/transfer` additionally requires an admin role.

This is a separate flow from the existing subscription checkout (`src/main/payments/stripe-payment`), which is untouched. It has its own Stripe client (`src/main/payments/stripe-client`) so neither flow can break the other.

---

## Database Schema

```
PaymentMethod {                          // prisma/schema/finance.prisma
  id          UUID    PK
  userId      UUID    FK → users
  type        String            // Stripe payment method type, e.g. "card"
  last4       String
  cardBrand   String?           // e.g. "visa", "mastercard"
  expMonth    Int?
  expYear     Int?
  isDefault   Boolean default(false)
  externalId  String?           // Stripe PaymentMethod ID (pm_xxx)
  payments    Payment[]
  createdAt / updatedAt
}

Payment {                                // prisma/schema/payment.prisma
  id                    UUID    PK
  payerId               UUID    FK → users ("PaymentsMade")
  payeeUserId           UUID?   FK → users ("PaymentsReceived")
  paymentMethodId       UUID?   FK → PaymentMethod
  stripePaymentIntentId String? @unique
  stripeCustomerId      String?
  amount                Int             // smallest currency unit (e.g. cents)
  currency              String  default("usd")
  platformFeeAmount     Int     default(0)
  payeeAmount           Int     default(0)
  status                PaymentStatus (PENDING | SUCCEEDED | FAILED | REFUNDED)
  description           String?
  failureReason         String?
  transfer              Transfer?
  createdAt / updatedAt
}

Transfer {
  id                UUID    PK
  paymentId         UUID    @unique FK → Payment
  payeeUserId       UUID    FK → users ("TransfersReceived")
  stripeTransferId  String? @unique
  amount            Int
  currency          String  default("usd")
  status            TransferStatus (PENDING | COMPLETED | FAILED)
  failureReason     String?
  createdAt / updatedAt
}

User (additions)                         // prisma/schema/user.prisma
  customerIdStripe     String?   // Stripe Customer ID — this user as a payer
  sellerIdStripe       String?   // Stripe Connect account ID — this user as a payee
  pendingSetupIntentId String?   // SetupIntent created at signup, awaiting client confirmation to save a card
```

Migrations: `prisma/migrations/20260704000000_add_payment_cards_connect`, `prisma/migrations/20260704120000_add_pending_setup_intent`.

> **Note:** Payment-method CRUD previously lived at `/finance/payment-methods` as a stub that stored arbitrary strings. It has been removed — real Stripe-backed card management now lives at `/payments/cards` (below).

---

## 1. Saved Cards — `src/main/payments/card`

Two-step flow: create a **SetupIntent**, confirm it client-side with Stripe.js/Elements, then tell the backend to persist the resulting card.

> **Auto-created at signup:** `POST /auth/register` (`AuthRegisterService`) now also creates the Stripe Customer *and* a SetupIntent as part of registration, storing the SetupIntent id in `User.pendingSetupIntentId` and returning its `clientSecret` as `setupIntentClientSecret` in the register response. This lets the client skip straight to confirming with Stripe.js right after signup instead of calling `POST /payments/cards/setup-intent` first. If Stripe fails during registration (non-fatal — logged, doesn't block signup), or the client just wants a fresh one, `POST /payments/cards/setup-intent` still works as a fallback/lazy path. Whichever SetupIntent is confirmed, `POST /payments/cards/confirm` persists the card and clears `pendingSetupIntentId` if it matches.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/cards/setup-intent` | JWT | Step 1 — creates a Stripe Customer for the user if needed, returns a SetupIntent `clientSecret` |
| POST | `/payments/cards/confirm` | JWT | Step 2 — persists the card after the client confirms the SetupIntent |
| GET | `/payments/cards` | JWT | List all saved cards (default first) |
| PATCH | `/payments/cards/:id/default` | JWT | Set a saved card as the default |
| DELETE | `/payments/cards/:id` | JWT | Detach from Stripe (best-effort) and delete; promotes the next-most-recent card to default if the deleted one was default |

### POST `/payments/cards/setup-intent`

No body required.

Response `data`:
```json
{ "clientSecret": "seti_..._secret_...", "setupIntentId": "seti_1Nxxxxxx" }
```

The frontend/Flutter app uses `clientSecret` with Stripe.js or the Stripe SDK to collect card details and confirm the SetupIntent directly with Stripe.

### POST `/payments/cards/confirm`

```json
{
  "setupIntentId": "seti_1Nxxxxxx",
  "isDefault": true
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `setupIntentId` | string | yes | Must belong to the current user's Stripe Customer and have `status: succeeded` |
| `isDefault` | boolean | no | Defaults to `true` automatically if this is the user's first saved card |

Errors: `400` if the SetupIntent hasn't succeeded yet, belongs to another customer, or has no attached payment method. Calling this twice with the same `setupIntentId` is safe — it returns the existing card instead of erroring.

### GET `/payments/cards`

Returns all saved cards, ordered `isDefault desc, createdAt desc`.

### PATCH `/payments/cards/:id/default`

Unsets any existing default and marks `:id` as default (transactional). `404` if the card doesn't belong to the caller.

### DELETE `/payments/cards/:id`

Detaches the Stripe payment method (failure to detach is logged but doesn't block deletion), deletes the row. If the deleted card was the default, the most recently created remaining card is promoted to default.

---

## 2. Charges — `src/main/payments/charge`

The single entry point any feature in the app should call to charge a user's saved card ("pay for X"). It is currency-agnostic and payee-agnostic — pass `payeeUserId` when the payment should eventually be shared with a brand/creator.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/charge` | JWT | Off-session charge on a saved card |
| GET | `/payments/:id` | JWT | Fetch a single payment (payer or payee only) |
| GET | `/payments` | JWT | List payments made or received by the current user |

### POST `/payments/charge`

```json
{
  "amount": 1999,
  "currency": "usd",
  "paymentMethodId": "<saved card id>",
  "payeeUserId": "<brand/creator user id>",
  "description": "Campaign boost"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `amount` | int | yes | Smallest currency unit (e.g. cents). Must be ≥ 1 |
| `currency` | string | no | Defaults to `usd` |
| `paymentMethodId` | string | no | Which saved card to charge. Omit to use the default card (falls back to most-recently-saved if none marked default) |
| `payeeUserId` | string | no | If set, `platformFeeAmount`/`payeeAmount` are computed and a later Connect transfer can pay this user their share. Cannot equal the payer |
| `description` | string | no | Free text |

Fee calculation: `platformFeeAmount = round(amount * PLATFORM_FEE_PERCENT / 100)`, `payeeAmount = amount - platformFeeAmount`, only when `payeeUserId` is set. Without a payee, the platform keeps 100% (`payeeAmount = 0`).

Behavior:
- Creates a `Payment` row as `PENDING` first, then calls `stripe.paymentIntents.create` with `off_session: true, confirm: true` against the saved payment method.
- On success, updates the row to `SUCCEEDED` (or leaves `PENDING` if Stripe hasn't finalized yet — the webhook reconciles this).
- On Stripe card errors, marks the row `FAILED` with `failureReason` and responds `400 Card declined: <reason>`.
- If the user has no usable saved card, responds `400` with `code: "NO_SAVED_CARD"` — the client should prompt the user to add a card via `/payments/cards/setup-intent` + `/confirm`, then retry.

### GET `/payments/:id`

Returns the payment with its `transfer` relation included. `404` unless the caller is the payer or payee.

### GET `/payments`

Lists all payments where the caller is payer or payee, newest first, each with `transfer` included.

---

## 3. Connect Payouts — `src/main/payments/connect`

Lets a brand/creator (payee) onboard to Stripe Connect Express so an admin can later transfer their share out of the platform balance.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/connect/onboard` | JWT | Create (if needed) an Express Connect account and return a hosted onboarding link |
| GET | `/payments/connect/status` | JWT | Check onboarding/payouts status |
| POST | `/payments/connect/transfer` | JWT + Admin | Transfer a succeeded payment's payee share to the payee's connected account |
| GET | `/payments/connect/return` | Public | Stripe redirects here when onboarding finishes (HTML landing page) |
| GET | `/payments/connect/refresh` | Public | Stripe redirects here when the onboarding link expired (HTML landing page) |

### POST `/payments/connect/onboard`

No body. Creates a Stripe Express account for the user on first call (stores `sellerIdStripe`), then always returns a fresh `accountLinks` URL.

Response `data`:
```json
{ "url": "https://connect.stripe.com/setup/...", "accountId": "acct_..." }
```

> There is no web frontend for this feature. The Flutter app opens `url` inside an in-app webview, watches for navigation to `/payments/connect/return` or `/payments/connect/refresh`, then closes the webview and calls `GET /payments/connect/status` to confirm the result. `return_url`/`refresh_url` are built from `BASE_URL`, not `FRONTEND_URL`.

### GET `/payments/connect/status`

Response `data`:
```json
{ "onboarded": true, "payoutsEnabled": true }
```
Returns `{ onboarded: false, payoutsEnabled: false }` (with message `"Not onboarded yet"`) if the user never started onboarding.

### POST `/payments/connect/transfer` (admin only)

```json
{ "paymentId": "<payment id>" }
```

Preconditions (else `400`/`404`/`409`):
- Payment exists and `status === 'SUCCEEDED'`
- Payment has a `payeeUserId` and `payeeAmount > 0`
- Payment has not already been transferred (`409 Conflict` if `transfer` already exists)
- The payee has completed Connect onboarding (`sellerIdStripe` set)

Creates a real `stripe.transfers.create` call (destination = payee's connected account, `transfer_group` = payment id) and records a `Transfer` row as `COMPLETED`.

---

## 4. Webhook — `src/main/payments/stripe-payment/controller/webhook.controller.ts`

`POST /webhook/stripe` (public, signature-verified via `STRIPE_WEBHOOK_SECRET`) now also reconciles saved-card charges, in addition to the existing subscription checkout handling:

- `payment_intent.succeeded` — if `metadata.type === 'card_charge'`, sets the matching `Payment.status = SUCCEEDED` by `stripePaymentIntentId`.
- `payment_intent.payment_failed` — if `metadata.type === 'card_charge'`, sets `Payment.status = FAILED` and stores `failureReason` from `last_payment_error.message`.

Existing `checkout.session.completed` subscription handling is unchanged. Both paths share the same endpoint but branch on `metadata.type`, so make sure any future PaymentIntent created by this feature always sets `metadata: { type: 'card_charge', paymentId, ... }` — the webhook silently no-ops (with a warning log) if it can't find a matching `Payment` row.

---

## Typical Client Flow

**Saving a card:**
1. `setupIntentClientSecret` from the `POST /auth/register` response (preferred) — or `POST /payments/cards/setup-intent` → get `clientSecret`
2. Client confirms with Stripe.js/Elements or the Stripe mobile SDK
3. `POST /payments/cards/confirm` with the `setupIntentId` → card is saved

**Paying (no payee, e.g. platform fee):**
1. `POST /payments/charge` with `amount` only → charges the default saved card

**Paying a brand/creator (marketplace):**
1. Payer: `POST /payments/charge` with `amount` + `payeeUserId` → platform is charged, `payeeAmount` recorded
2. Payee (any time before this): `POST /payments/connect/onboard` → completes Stripe Connect onboarding
3. Admin: `POST /payments/connect/transfer` with `paymentId` → releases `payeeAmount` to the payee's connected account

---

## Error Reference

| Status | Trigger |
|---|---|
| 400 `NO_SAVED_CARD` | Charging a user with no usable saved card |
| 400 `Card declined: ...` | Stripe `StripeCardError` during charge |
| 400 | `payeeUserId === payerId`; SetupIntent not succeeded / wrong customer / no payment method; transfer preconditions not met |
| 404 | Card/payment/payee/user not found, or not owned by the caller |
| 409 | Transfer already exists for this payment |
