# NestJS Server Template - Web & In-App Subscriptions

A production-ready NestJS server template featuring **Web (Stripe) and In-App (iOS App Store & Android Google Play Store) Subscriptions with Webhook Integration**, powered by Prisma ORM and PostgreSQL.

---

## 🚀 Core Features

### 💳 Subscriptions & Payments
- **Web Subscriptions (Stripe)**:
  - Stripe Checkout session creation (`/api/v1/subscriptions/web/checkout`)
  - Stripe Customer Portal session (`/api/v1/subscriptions/web/portal`)
  - Automatic Customer & Price ID mapping
- **In-App Subscriptions (iOS & Android)**:
  - In-App Purchase receipt & purchase token verification (`/api/v1/subscriptions/in-app/verify`)
  - iOS StoreKit product & transaction tracking (`originalTransactionId`, `latestTransactionId`)
  - Android Google Play purchase token & subscription sync
- **Webhook Handlers**:
  - **Stripe Listener**: `/api/v1/subscriptions/webhook/stripe`
  - **Apple App Store Server Notifications V2**: `/api/v1/subscriptions/webhook/apple`
  - **Google Play RTDN**: `/api/v1/subscriptions/webhook/google`
- **Subscription Management**:
  - Fetch active subscription plans (`/api/v1/subscriptions/plans`)
  - Get current logged-in user subscription (`/api/v1/subscriptions/me`)
  - Subscription cancellation (`/api/v1/subscriptions/cancel`)

### 🔐 Authentication & Security
- JWT-based authentication with refresh token rotation
- Email OTP verification & Password reset
- Role-based authorization (`SUPER_ADMIN`, `ADMIN`, `USER`)
- Password hashing with Bcrypt

---

## 🛠️ Getting Started

### Installation & Database Setup
```bash
# Install dependencies
pnpm install

# Generate Prisma Client
pnpm prisma generate

# Apply migrations
pnpm db:migrate

# Run app in dev mode
pnpm dev
```

### Environment Configuration (`.env`)
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/pavann_db?schema=public"
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"

# Web Subscriptions (Stripe)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
FRONTEND_URL="http://localhost:3000"
```

---

## 📚 API Documentation

Swagger documentation is automatically generated and accessible at:
- **`http://localhost:5000/docs`**

Endpoints include:
- `GET /api/v1/subscriptions/plans`
- `GET /api/v1/subscriptions/me`
- `POST /api/v1/subscriptions/web/checkout`
- `POST /api/v1/subscriptions/web/portal`
- `POST /api/v1/subscriptions/in-app/verify`
- `POST /api/v1/subscriptions/cancel`
- `POST /api/v1/subscriptions/webhook/stripe`
- `POST /api/v1/subscriptions/webhook/apple`
- `POST /api/v1/subscriptions/webhook/google`
