# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.3.1 e-commerce application for a bagel shop (Rakuda Picnic) in Matsuyama, Japan. The app uses TypeScript, App Router, and integrates with Supabase for the database and Stripe for payments.

## Core Commands

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database Management (Prisma)
npm run db:generate      # Generate Prisma Client after schema changes
npm run db:push          # Push schema changes to database (no migration history)
npm run db:migrate:dev   # Create and apply migrations in development
npm run db:migrate       # Apply migrations in production
npm run db:studio        # Open Prisma Studio GUI for database inspection
```

## Architecture Overview

### Dual Database Access Pattern
The codebase is transitioning from Supabase client to Prisma ORM:
- **Legacy**: Direct Supabase client calls (`@supabase/supabase-js`)
- **New**: Prisma ORM with type safety (`@prisma/client`)
- Both patterns coexist during migration

### State Management Architecture
1. **Client State**: Zustand store for shopping cart (`/store/cart-store.ts`)
   - Persisted to localStorage
   - Manages items, quantities, dispatch date/time, payment method
   
2. **Server State**: Supabase/Prisma for all other data
   - Products, orders, profiles, time slots

### Authentication Flow
- NextAuth.js with Google OAuth provider
- Session stored in JWT tokens
- User profiles in Supabase with `is_admin` flag for role-based access
- Middleware protects `/account/*` and `/online-shop/*` routes

### Payment Processing
Stripe integration with manual capture flow:
1. Create Payment Intent when entering payment page
2. Capture payment 30 minutes before dispatch time via cron job
3. Payment states: `pending` → `succeeded`/`cancelled`

### Key Business Constraints
- `MAX_BAGEL_PER_ORDER = 8` - Maximum bagels per order
- `MAX_BAGEL_PER_ITEM = 3` - Maximum quantity per product
- `STORE_PHONE_NUMBER = '089-904-2666'`

## Database Schema

Key tables (via Prisma):
- `products` - Product catalog with categories, availability dates
- `orders` - Orders with JSON items array, payment/shipping status
- `profiles` - User profiles linked to auth system
- `time_slots` - Available pickup times with capacity limits
- `categories` - Product categorization

## API Route Structure

```
/api/
├── products/          # Product CRUD
├── orders/            # Order management
├── create-payment-intent/  # Stripe payment initiation
├── capture-payment/   # Manual payment capture
├── time_slots/        # Pickup time management
├── admin/             # Admin-only endpoints
│   ├── summary/       # Dashboard KPIs
│   ├── sales-stats/   # Analytics data
│   └── reservations/  # Order management
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

# Stripe
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLIC_KEY

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
3. Review order → Create order record
4. Payment → Stripe checkout with saved cards option
5. Success → Order confirmation email

### Admin Dashboard
- Located at `/admin/*` routes
- Requires `is_admin: true` in profiles table
- Features: order management, product CRUD, time slot configuration, sales analytics

### Time Slot Management
- Booking system for pickup times
- Capacity limits per time slot
- Automatic availability updates based on current bookings