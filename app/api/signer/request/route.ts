import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSignerKeypair } from '@/app/lib/farcasterSigners';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are not configured.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const address = typeof body?.address === 'string' ? body.address : undefined;

    if (!address) {
      return NextResponse.json({ message: 'address is required' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('address')
      .eq('address', normalizedAddress)
      .maybeSingle();

    if (fetchError) {
      console.error('Failed to lookup user during signer request:', fetchError);
      return NextResponse.json({ message: 'Failed to prepare signer.' }, { status: 500 });
    }

    if (!existingUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const { publicKey, privateKey } = await generateSignerKeypair();

    const { error: upsertError } = await supabase
      .from('user_signers')
      .upsert(
        {
          address: normalizedAddress,
          public_key: publicKey,
          private_key: privateKey,
          fid: null,
          signer_uuid: null,
          confirmed_at: null,
        },
        { onConflict: 'address' }
      );

    if (upsertError) {
      console.error('Failed to persist signer keys:', upsertError);
      return NextResponse.json({ message: 'Failed to store signer details.' }, { status: 500 });
    }

    const deepLink = `https://warpcast.com/~/add-signer?public_key=${publicKey}`;

    return NextResponse.json({ publicKey, deepLink });
  } catch (error) {
    console.error('Unhandled signer request error:', error);
    return NextResponse.json({ message: 'Failed to request signer.' }, { status: 500 });
  }
}
