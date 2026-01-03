# Authentication System Documentation

## Overview
This application uses session-based authentication with Lucia Auth and PostgreSQL for secure user management.

## Tech Stack
- **Lucia Auth v3**: Session-based authentication library
- **PostgreSQL**: Session and user data storage  
- **bcrypt**: Password hashing (10 salt rounds)
- **HTTP-only cookies**: Secure session storage

## Architecture

### Database Schema
**Users Table:**
```typescript
- id: UUID (primary key)
- name: string
- username: string (unique)
- email: string (unique)  
- password: string (hashed)
- role: 'admin' | 'user'
- employeeId: UUID (foreign key, nullable)
- siteId: UUID (foreign key, nullable)
```

**Sessions Table:**
```typescript
- id: text (primary key)
- userId: UUID (foreign key → users, cascade delete)
- expiresAt: timestamp with timezone
```

### API Endpoints

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "uuid",
    "name": "Admin User",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Response (Error - 400/401/500):**
```json
{
  "success": false,
  "message": "Error message"
}
```

#### POST /api/auth/logout
Logout and invalidate current session.

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /api/auth/session
Get current user session.

**Response (Success - 200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "employeeId": null,
    "siteId": null
  },
  "session": {
    "id": "session-id",
    "userId": "uuid",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Not authenticated"
}
```

### Middleware Protection

#### Server-Side Middleware (`server/middleware/auth.ts`)
Automatically protects all `/api/*` routes except:
- `/api/auth/login`
- `/api/auth/session`
- `/_nuxt/*` (build assets)

**Features:**
- Validates session from cookie
- Attaches `user` and `session` to `event.context`
- Auto-refreshes sessions when fresh
- Returns 401 for unauthorized requests

**Usage in API handlers:**
```typescript
export default defineEventHandler(async (event) => {
  // User is automatically available
  const user = event.context.user
  const session = event.context.session
  
  // User will always be authenticated here
  // or the middleware would have rejected the request
})
```

#### Client-Side Middleware (`app/middleware/auth.ts`)
Protects dashboard pages from unauthenticated access.

**Usage:**
```typescript
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'  // Add this to protect the page
})
```

### Frontend Composable

#### useAuth()
Provides authentication state and methods in Vue components.

**Usage:**
```typescript
const { user, isAuthenticated, loading, fetchSession, logout } = useAuth()

// User object
user.value // Current user data or null

// Check authentication status
isAuthenticated.value // true if user is logged in

// Fetch current session
await fetchSession() // Returns boolean

// Logout
await logout() // Redirects to /login
```

### Demo Credentials

**Admin Account:**
- Email: `admin@example.com`
- Password: `password`

**Regular Users:**
- Email: `jane@example.com` | Password: `password`
- Email: `michael@example.com` | Password: `password`

## Security Features

1. **Password Hashing**: All passwords hashed with bcrypt (10 salt rounds)
2. **HTTP-only Cookies**: Session IDs stored in HTTP-only cookies (not accessible via JavaScript)
3. **Secure Cookies**: HTTPS-only in production
4. **Session Expiration**: Automatic session invalidation after expiry
5. **Auto-refresh**: Sessions refresh automatically when they are fresh
6. **API Protection**: All API routes protected by default

## Testing the Authentication

### 1. Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### 2. Test Session
```bash
curl http://localhost:3000/api/auth/session \
  -H "Cookie: auth_session=YOUR_SESSION_COOKIE"
```

### 3. Test Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: auth_session=YOUR_SESSION_COOKIE"
```

### 4. Test Protected API
```bash
# Without session - should return 401
curl http://localhost:3000/api/users

# With session - should return data
curl http://localhost:3000/api/users \
  -H "Cookie: auth_session=YOUR_SESSION_COOKIE"
```

## Migration from Lucia v3

⚠️ **Note**: Lucia Auth v3 is deprecated. The package is functional but maintenance has ended.

**Migration Guide**: https://lucia-auth.com/lucia-v3/migrate

**Alternative Solutions:**
- Implement custom session management
- Use next-auth/auth.js
- Use Nuxt Auth Utils
- Use Supabase Auth

## Troubleshooting

### Issue: Login returns 401
- Verify email and password are correct
- Check database has seeded users (run `npm run seed`)
- Verify passwords are hashed in database

### Issue: Session not persisting
- Check cookie settings in browser
- Verify `DATABASE_URL` environment variable
- Ensure sessions table exists (run `npx drizzle-kit push`)

### Issue: Protected pages not redirecting
- Verify `middleware: 'auth'` in `definePageMeta`
- Check browser console for errors
- Ensure `fetchSession()` is called on page load

### Issue: API returns 401
- Verify session cookie is being sent
- Check middleware is not skipping the route
- Verify session hasn't expired

## Development Notes

### Running the Seeder
To create initial users and data:
```bash
npm run seed
```

### Pushing Schema Changes
After modifying schema:
```bash
npx drizzle-kit push
```

### Checking Migration Status
```bash
npx drizzle-kit check
```

## Production Checklist

- [ ] Change all demo passwords
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Set secure cookie flags
- [ ] Implement rate limiting on login
- [ ] Add CSRF protection
- [ ] Set up monitoring for failed login attempts
- [ ] Implement password reset flow
- [ ] Add email verification
- [ ] Consider migrating from deprecated Lucia v3
- [ ] Set appropriate session expiration times
- [ ] Configure session cleanup job
