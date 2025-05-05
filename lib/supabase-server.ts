// lib/supabase-server.ts
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { type NextRequest } from 'next/server';

export const createServerSupabaseClient = async (req: NextRequest) => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
      },
    }
  );

  return supabase;
};
