# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.3.4 e-commerce application for a bagel shop (Rakuda Picnic) in Matsuyama, Japan. The app uses TypeScript, App Router, and integrates with Supabase for the database. Orders are placed online for in-store pickup with cash payment.

## Core Commands

```bash
# Development
pnpm dev                 # Start development server (without Turbopack due to React 19 compatibility)
pnpm dev:turbo          # Start with Turbopack (experimental, may have issues)
pnpm build              # Build for production
pnpm start              # Start production server
pnpm lint               # Run ESLint

# Database Management (Prisma)
pnpm db:generate        # Generate Prisma Client after schema changes
pnpm db:push           # Push schema changes to database (no migration history)
pnpm db:migrate:dev    # Create and apply migrations in development
pnpm db:migrate        # Apply migrations in production
pnpm db:studio         # Open Prisma Studio GUI for database inspection
```

## Architecture Overview

### React 19 & NextAuth v4 Compatibility

**CRITICAL**: This project uses React 19 with NextAuth v4, which have known compatibility issues. The codebase has been modified to work around these issues:

- `useSession` from `next-auth/react` is used with `SessionProvider` wrapping the app
- Custom client-side auth helpers in `/lib/next-auth-client.ts`:
  - `clientSignIn()` - Handles Google OAuth sign-in
  - `clientSignOut()` - Handles sign-out
- The `authOptions` in `/app/lib/auth.ts` have `pages` set to `undefined` to use NextAuth's built-in flows
- Legacy auth helpers in `/lib/auth-helpers.ts` should not be used

### Dual Database Access Pattern
The codebase is transitioning from Supabase client to Prisma ORM:
- **Legacy**: Direct Supabase client calls (`@supabase/supabase-js`)
- **New**: Prisma ORM with type safety (`@prisma/client`)
- Both patterns coexist during migration

### State Management Architecture
1. **Client State**: Zustand store for shopping cart (`/store/cart-store.ts`)
   - Persisted to localStorage
   - Manages items, quantities, dispatch date/time
   
2. **Server State**: Supabase/Prisma for all other data
   - Products, orders, profiles, time slots, business calendar

### Authentication Flow
- NextAuth.js v4 with Google OAuth provider
- Session stored in JWT tokens
- User profiles in Supabase with `is_admin` flag for role-based access
- Middleware protects `/account/*` and `/online-shop/*` routes
- Admin check: `session?.user?.role === 'admin'`

### Payment Processing
Cash-only payment at store during pickup:
1. Orders are placed online with customer information
2. Payment is collected in cash when customers pick up their order
3. Orders can be marked as `shipped` (picked up) in admin panel
4. Cancelled orders have `payment_status='cancelled'`

### Key Business Constraints
- `MAX_BAGEL_PER_ORDER = 8` - Maximum bagels per order
- `MAX_BAGEL_PER_ITEM = 3` - Maximum quantity per product
- `STORE_PHONE_NUMBER = '089-904-2666'`
- No bag fee (previously ¥10, now removed)

## Database Schema

Key tables (via Prisma):
- `products` - Product catalog with categories, availability dates
- `orders` - Orders with JSON items array, shipping status, payment_status
- `profiles` - User profiles linked to auth system
- `time_slots` - Available pickup times with capacity limits
- `categories` - Product categorization
- `business_days` - Store operating days configuration
- `business_hours` - Store operating hours by day
- `recurring_holidays` - Recurring holiday patterns
- `news` - News/announcements with date, title, content

## API Route Structure

```
/api/
├── products/          # Product CRUD
├── orders/            # Order management
├── create-order/      # Create new order
├── time_slots/        # Pickup time management
├── business-calendar/ # Store calendar management
├── news/              # News management
├── admin/             # Admin-only endpoints
│   ├── summary/       # Dashboard KPIs (excludes cancelled orders)
│   ├── sales-stats/   # Analytics data (excludes cancelled orders)
│   ├── reservations/  # Order management
│   ├── news/          # Admin news CRUD
│   └── business-calendar/  # Calendar admin endpoints
└── auth/[...nextauth]/ # Authentication
```

## Environment Configuration

Required environment variables:
```env
# Database (Prisma)
DATABASE_URL="postgres://...@db.*.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://...@db.*.supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Authentication
NEXTAUTH_URL
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# Other
RESEND_API_KEY
CRON_SECRET
```

## Migration Notes

### Supabase to Prisma Migration
- Port 5432 (direct connection) is not accessible externally
- Use port 6543 (PgBouncer) for all operations
- Migration history is tracked via `prisma migrate resolve`
- For schema changes: generate SQL with `prisma migrate diff` then apply manually

### Prisma Configuration
- schema.prisma uses PgBouncer-compatible settings
- `pgbouncer=true` parameter prevents prepared statement errors
- Initial migration (000_init) already applied to existing database

## Project-Specific Patterns

### Shopping Cart Flow
1. Browse products → Add to cart (Zustand store)
2. Select dispatch date/time → Required before checkout
3. Checkout → Enter customer information (requires authentication)
4. Review order → Create order record
5. Success → Order confirmation email
6. Pay in cash at store during pickup

### Admin Dashboard
- Located at `/admin/*` routes
- Requires `is_admin: true` in profiles table
- Features: order management, product CRUD, time slot configuration, sales analytics, business calendar, news management

### Time Slot Management
- Booking system for pickup times
- Capacity limits per time slot
- Automatic availability updates based on current bookings
- Integrated with business calendar for holidays/closures

### Business Calendar System
- Dynamic store hours configuration
- Recurring holiday patterns (e.g., 4th Sunday of month)
- Special closure dates
- Bulk operation support for setting multiple days
- Real-time availability checking for orders

### Order Status Management
- Orders can be cancelled (sets `payment_status='cancelled'`)
- Cancelled orders are excluded from all metrics and totals
- Visual indicators: Red color and strikethrough for cancelled orders
- Cannot mark cancelled orders as shipped or edit them

### News System
- Admin can create/edit/delete news items
- News displayed on homepage (limit 2) and news page (all)
- Character limits: Title 40 chars, content 80 chars for homepage display
- Admin receives visual warnings when exceeding character limits