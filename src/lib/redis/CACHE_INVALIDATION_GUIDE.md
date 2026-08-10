# Redis Cache Invalidation Implementation

## Overview
Implemented proper **Cache Aside Pattern** with automatic cache invalidation for user profile mutations in the NestJS auth system.

---

## ✅ Implementation Summary

### 1. **UserCacheService Enhanced** 
📂 `src/lib/redis/user-cache.service.ts`

#### New Helper Method:
```typescript
async invalidateUserCache(userId: string, email?: string): Promise<{ success: boolean; error?: string }>
```

**Features:**
- ✅ Single method to invalidate all user caches (profile, session, email)
- ✅ Try/catch error handling - Redis failures won't break main API
- ✅ Structured logging with console messages
- ✅ Returns success/error status

#### New Logging Methods:
```typescript
logCacheHit(userId: string, dataType: string = 'profile'): void
logCacheMiss(userId: string, dataType: string = 'profile'): void
```

**Output Example:**
```
✅ profile fetched from cache: user-123
📭 Cache miss for profile: user-456 - fetching from DB
🗑️  Cache invalidated for user user-789 (email: user@example.com)
⚠️  Failed to invalidate cache for user user-999: connection error
```

---

## 🔄 Cache Invalidation Applied to:

### 2. **Profile Updates**
📂 `src/main/auth/services/auth-update-profile.service.ts`

**Triggers invalidation when:**
- User name changes
- Profile photo updates

```typescript
const cacheResult = await this.userCache.invalidateUserCache(userId, user.email);
```

---

### 3. **Password Changes**
📂 `src/main/auth/services/auth-password.service.ts`

**Triggers invalidation when:**
- Password is set (social login users)
- Password is changed by user
- Password is reset via OTP

**Locations:**
- `changePassword()` - 2 invalidation points
- `resetPassword()` - 1 invalidation point

---

### 4. **Email Verification**
📂 `src/main/auth/services/auth-otp.service.ts`

**Triggers invalidation when:**
- User email is verified
- User status changes from INACTIVE → ACTIVE

```typescript
const updatedUser = await this.prisma.client.user.update({...});
await this.userCache.invalidateUserCache(updatedUser.id, email);
```

---

### 5. **Subscription Updates**
📂 `src/main/payments/stripe-payment/service/subscription.service.ts`

**Triggers invalidation when:**
- Subscription is created
- Subscription is updated
- Subscription is cancelled
- Subscription is renewed

**Methods updated:**
- `createSubscription()` - invalidates after creation/update
- `updateSubscription()` - invalidates after plan/status change
- `cancelSubscription()` - invalidates after cancellation
- `renewSubscription()` - invalidates after renewal

---

## 📊 READ FLOW (Cache-Aside Pattern)

```
GET /auth/profile
  ↓
Check if ENABLE_CACHE=true in .env
  ↓
YES → Try Redis cache
  ↓
Cache HIT
  ✅ Return cached data
  📊 Log: ✅ profile fetched from cache: user-123
  
Cache MISS
  ↓
  📭 Fetch fresh data from DB
  📊 Log: 📭 Cache miss for profile: user-123 - fetching from DB
  ↓
  💾 Store in Redis (3600s TTL)
  ✅ Return fresh data
```

---

## 📝 WRITE FLOW (Invalidation Pattern)

```
PUT /auth/profile (Update profile)
  ↓
✅ Update DB first (data consistency first)
  ↓
🗑️ Delete Redis cache keys:
  - user:{userId}
  - user:email:{email}
  - user:session:{userId}
  ↓
📊 Log invalidation (success/error)
  ✅ Return updated data
```

---

## 🛡️ Error Handling

**Redis Failure Behavior:**
- If Redis cache invalidation fails, the API response is NOT affected
- Error is logged but doesn't break the response
- Main API data is already updated in DB
- User gets fresh data on next request

**Example:**
```typescript
await this.userCache.invalidateUserCache(userId, email);
// Even if Redis is down or unreachable:
// ✅ API still returns 200 response
// ✅ Database changes are applied
// ⚠️ Error logged for monitoring
```

---

## 🎛️ Toggle Cache ON/OFF

### Development (Disable Cache)
```env
ENABLE_CACHE=false
```

### Production (Enable Cache)
```env
ENABLE_CACHE=true
```
Or omit (defaults to `true`)

---

## 📋 Cached Data Types

| Key Pattern | TTL | Data |
|---|---|---|
| `user:{userId}` | 1 hour | Full user profile (id, email, name, role, etc.) |
| `user:email:{email}` | 1 hour | Maps email → userId |
| `user:session:{userId}` | 24 hours | User session data |
| `login:attempts:{email}` | 15 min | Failed login attempts (rate limiting) |
| `user:otp:{userId}:{type}` | 10 min | OTP tokens |

---

## 🔍 Monitoring & Logs

### Console Output Examples

**Cache Hit:**
```
✅ profile fetched from cache: b745e54c-3846-429b-8a35-a9070e69240b
```

**Cache Miss:**
```
📭 Cache miss for profile: b745e54c-3846-429b-8a35-a9070e69240b - fetching from DB
```

**Invalidation Success:**
```
🗑️  Cache invalidated for user b745e54c-3846-429b-8a35-a9070e69240b (email: user@example.com)
```

**Invalidation Error:**
```
⚠️  Failed to invalidate cache for user b745e54c-3846-429b-8a35-a9070e69240b: connection error
```

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Reusable Helper** | Single method `invalidateUserCache()` handles all cache invalidation |
| **Error Safe** | Try/catch prevents Redis failures from breaking API |
| **Automatic** | No manual cache management needed after mutations |
| **Centralized Logging** | Consistent log format across all cache operations |
| **Toggle Control** | Easy enable/disable via environment variable |
| **No TTL Changes** | Existing cache TTL behavior unchanged (1hr for profile) |
| **Email-aware** | Invalidates both user ID and email-based caches |

---

## 🚀 Expected Behavior After Implementation

### Before (❌ Stale Cache Problem)
```
1. User updates profile
2. DB updated ✅
3. Redis still has old data ❌
4. API returns stale profile ❌
```

### After (✅ Fresh Data)
```
1. User updates profile
2. DB updated ✅
3. Redis cache deleted 🗑️
4. API returns fresh profile ✅
5. Next GET request rebuilds cache 💾
```

---

## 📝 Files Modified

1. ✅ `src/lib/redis/user-cache.service.ts` - Added helper methods
2. ✅ `src/main/auth/services/auth-get-profile.service.ts` - Enhanced logging
3. ✅ `src/main/auth/services/auth-update-profile.service.ts` - Added invalidation
4. ✅ `src/main/auth/services/auth-password.service.ts` - Added invalidation (3 places)
5. ✅ `src/main/auth/services/auth-otp.service.ts` - Added invalidation
6. ✅ `src/main/payments/stripe-payment/service/subscription.service.ts` - Added invalidation (4 methods)

---

## 🎯 Next Steps (Optional)

If needed, apply similar invalidation pattern to:
- Notification preference updates
- Avatar/file uploads
- Email change operations
- Role/permission changes

Use the same `invalidateUserCache()` helper method.

---

