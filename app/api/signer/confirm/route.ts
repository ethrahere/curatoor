import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { HubRestAPIClient, DEFAULT_HUB_URL } from '@standard-crypto/farcaster-js-hub-rest';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hubUrl = process.env.FARCASTER_HUB_URL ?? DEFAULT_HUB_URL;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are not configured.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const hubClient = new HubRestAPIClient({ hubUrl });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const address = typeof body?.address === 'string' ? body.address : undefined;
    const fidValue = body?.fid;
    const fid = typeof fidValue === 'number' ? fidValue : Number(fidValue);
    const signerUuid = typeof body?.signerUuid === 'string' ? body.signerUuid : undefined;

    if (!address) {
      return NextResponse.json({ message: 'address is required' }, { status: 400 });
    }

    if (!fid || Number.isNaN(fid)) {
      return NextResponse.json({ message: 'fid is required to confirm the signer.' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    const { data: signerRow, error: signerFetchError } = await supabase
      .from('user_signers')
      .select('public_key, fid, confirmed_at')
      .eq('address', normalizedAddress)
      .maybeSingle();

    if (signerFetchError) {
      console.error('Failed to load signer row:', signerFetchError);
      return NextResponse.json({ message: 'Failed to confirm signer.' }, { status: 500 });
    }

    if (!signerRow) {
      return NextResponse.json({ message: 'No pending signer for this user.' }, { status: 400 });
    }

    if (signerRow.fid && signerRow.fid === fid && signerRow.confirmed_at) {
      return NextResponse.json({ fid: signerRow.fid, confirmed: true });
    }

    const publicKey = signerRow.public_key;
    const hubSignerKey = publicKey.startsWith('0x') ? publicKey : `0x${publicKey}`;
    const timeoutMs = Math.min(Number(process.env.SIGNER_CONFIRM_TIMEOUT_MS ?? 15000), 60000);
    const pollIntervalMs = Math.min(Number(process.env.SIGNER_CONFIRM_POLL_INTERVAL_MS ?? 2000), 5000);
    const deadline = Date.now() + timeoutMs;

    let approved = false;
    let lastError: unknown = null;

    while (Date.now() <= deadline) {
      try {
        const event = await hubClient.getOnChainSignerEventBySigner(fid, hubSignerKey);
        if (event) {
          approved = true;
          break;
        }
      } catch (err) {
        lastError = err;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    if (!approved) {
      if (lastError) {
        console.error('Failed to verify signer on hub:', lastError);
        return NextResponse.json({ message: 'Unable to verify signer status with Farcaster Hub.' }, { status: 502 });
      }

      return NextResponse.json(
        { message: 'Signer approval not found on Farcaster Hub yet. Please retry shortly.' },
        { status: 408 }
      );
    }

    const { error: updateError } = await supabase
      .from('user_signers')
      .update({
        fid,
        signer_uuid: signerUuid ?? null,
        confirmed_at: new Date().toISOString(),
      })
      .eq('address', normalizedAddress);

    if (updateError) {
      console.error('Failed to persist signer confirmation:', updateError);
      return NextResponse.json({ message: 'Failed to persist signer confirmation.' }, { status: 500 });
    }

    return NextResponse.json({ fid, confirmed: true });
  } catch (error) {
    console.error('Unhandled signer confirmation error:', error);
    return NextResponse.json({ message: 'Failed to confirm signer.' }, { status: 500 });
  }
}
