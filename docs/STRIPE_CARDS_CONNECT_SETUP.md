# Setup Guide — Stripe Cards, Charges & Connect

Companion to [`PAYMENTS_CARDS_CONNECT_API.md`](./PAYMENTS_CARDS_CONNECT_API.md). This covers everything needed to make that feature work in a given environment: env vars, Stripe Dashboard configuration, and DB migration.

## 1. Environment Variables

Add/verify these in `.env` (see `src/common/enum/env.enum.ts`):

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | Stripe secret API key. Shared by the existing subscription flow and this feature's `StripeClientModule` |
| `STRIPE_WEBHOOK_SECRET` | yes (prod) | Signing secret for the `/webhook/stripe` endpoint. Without it, signature verification is **skipped** — fine for local testing, never for production |
| `STRIPE_PUBLIC_KEY` | yes | Used by the frontend/Flutter app to initialize Stripe.js/the Stripe SDK |
| `PLATFORM_FEE_PERCENT` | no (defaults to `10`) | Integer percent taken as `platformFeeAmount` on payments with a `payeeUserId` |
| `BASE_URL` | yes | Must be this API's **public** URL (e.g. `https://api.example.com`). Used to build the Connect onboarding `return_url`/`refresh_url` — Stripe redirects the onboarding webview here, not to `FRONTEND_URL`, since there is no web frontend for this feature |

`PLATFORM_FEE_PERCENT=10` is already present in `.env`; add it to any other environment (staging/production) that's missing it.

## 2. Stripe Dashboard Configuration

1. **API keys** — use a Standard Stripe account's secret/public key pair (Dashboard → Developers → API keys).
2. **Connect** — enable Stripe Connect on the account (Dashboard → Connect → Get started) and select **Express** accounts as the account type. No extra Connect settings are required for this feature beyond enabling it — `ConnectService.onboard` requests the `transfers` capability per-account at creation time.
3. **Webhook endpoint** — Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `<BASE_URL>/webhook/stripe`
   - Events to send, in addition to whatever the existing subscription flow already needs (`checkout.session.completed`, `checkout.session.async_payment_failed`):
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Copy the endpoint's **Signing secret** into `STRIPE_WEBHOOK_SECRET`.
4. **Off-session charges** — `ChargeService.createCharge` uses `off_session: true, confirm: true`. This requires the SetupIntent used to save the card to have been confirmed with `automatic_payment_methods: { enabled: true, allow_redirects: 'never' }` (already how `CardService.createSetupIntent` creates it) so the resulting payment method is eligible for off-session use without extra 3DS friction. Cards that require interactive authentication on every charge (some EU cards under SCA) may still return `requires_action` — this is not currently handled and shows up as a Stripe error surfaced to the caller.

## 3. Database Migration

New tables/columns are defined in `prisma/schema/payment.prisma` / `prisma/schema/user.prisma` and applied via:

```
prisma/migrations/20260704000000_add_payment_cards_connect/migration.sql
prisma/migrations/20260704120000_add_pending_setup_intent/migration.sql
```

Adds:
- `PaymentStatus`, `TransferStatus` enums
- `payment_methods.cardBrand`, `.expMonth`, `.expYear`
- `users.customerIdStripe`, `users.sellerIdStripe`
- `users.pendingSetupIntentId` — SetupIntent id created automatically during registration, cleared once confirmed via `POST /payments/cards/confirm`
- new `payments` and `transfers` tables

Run before deploying this code:

```bash
npx prisma migrate deploy
```

(or `npx prisma migrate dev` locally to also regenerate the client). Regenerate the Prisma client if your workflow doesn't do this automatically:

```bash
npx prisma generate
```

## 4. Raw Body Requirement (already satisfied)

Stripe webhook signature verification requires the **raw** request body. `src/main.ts` already registers `bodyParser.raw()` for the webhook route ahead of the global `bodyParser.json()`, populating `req.rawBody`. No changes needed here — noted for anyone touching `main.ts`'s body-parser setup in the future, since removing/reordering it will silently break webhook verification (`400 Invalid request body`).

## 5. Deprecated Endpoint Removed

`POST/GET/DELETE /finance/payment-methods` (and `AddPaymentMethodDto`) have been removed — they were a stub that stored arbitrary strings without touching Stripe. Any existing frontend/client code pointing at those routes must be migrated to `/payments/cards/*` (see the API doc). There is no data migration for old rows since the old endpoint never created real Stripe payment methods.

## 6. Manual Test Checklist

Using Stripe test mode (`pk_test_.../sk_test_...`) and [test cards](https://stripe.com/docs/testing):

1. `POST /auth/register` → response includes `setupIntentClientSecret` and the user row gets `customerIdStripe`/`pendingSetupIntentId` set → confirm with test card `4242 4242 4242 4242` client-side → `POST /payments/cards/confirm`. (Alternatively call `POST /payments/cards/setup-intent` to test the fallback path.)
2. `GET /payments/cards` → new card appears, `isDefault: true`.
3. `POST /payments/charge` with a small `amount` → verify `Payment.status` becomes `SUCCEEDED` (either inline or after the webhook fires — use `stripe listen --forward-to localhost:<port>/webhook/stripe` locally).
4. Repeat charge with a payee: `POST /payments/charge` with `payeeUserId` set → confirm `platformFeeAmount`/`payeeAmount` split.
5. As the payee user: `POST /payments/connect/onboard` → complete Stripe's hosted test onboarding → `GET /payments/connect/status` → `payoutsEnabled: true`.
6. As admin: `POST /payments/connect/transfer` with the payment's `id` → confirm a `Transfer` row is created and Stripe Dashboard shows the transfer.
7. Test failure path with card `4000 0000 0000 0002` (always declines) → confirm `Payment.status = FAILED` and a `400 Card declined` response.
