import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are not configured.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const addressParam = searchParams.get('address') ?? undefined;

  if (!addressParam) {
    return NextResponse.json({ message: 'address is required' }, { status: 400 });
  }

  const address = addressParam.toLowerCase();

  try {
    const { data, error } = await supabase
      .from('user_signers')
      .select('fid, confirmed_at')
      .eq('address', address)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch signer status:', error);
      return NextResponse.json({ message: 'Failed to load signer status.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ confirmed: false }, { status: 404 });
    }

    const confirmed = Boolean(data.confirmed_at && data.fid);

    return NextResponse.json({ confirmed, fid: data.fid ?? null });
  } catch (error) {
    console.error('Unhandled signer status error:', error);
    return NextResponse.json({ message: 'Failed to load signer status.' }, { status: 500 });
  }
}
