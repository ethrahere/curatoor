import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publishCast } from '@/app/lib/farcaster';

type RecommendationRow = {
  id: string;
  song_title: string;
  artist: string;
  curator_address: string;
  users?: {
    username?: string | null;
    farcaster_username?: string | null;
  } | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are not configured.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const APP_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://myapp.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const recommendationId = body?.recommendationId as string | undefined;

    if (!recommendationId) {
      return NextResponse.json({ message: 'recommendationId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('recommendations')
      .select(
        `id, song_title, artist, curator_address,
         users:users!recommendations_curator_address_fkey(username, farcaster_username)`
      )
      .eq('id', recommendationId)
      .maybeSingle();

    const recommendation = (data as RecommendationRow | null) ?? null;

    if (error) {
      console.error('Failed to fetch recommendation for cast:', error);
      return NextResponse.json({ message: 'Failed to fetch recommendation' }, { status: 500 });
    }

    if (!recommendation) {
      return NextResponse.json({ message: 'Recommendation not found' }, { status: 404 });
    }

    const { data: signerRow, error: signerError } = await supabase
      .from('user_signers')
      .select('private_key, fid')
      .eq('address', recommendation.curator_address.toLowerCase())
      .maybeSingle();

    if (signerError) {
      console.error('Failed to load signer credentials:', signerError);
      return NextResponse.json({ message: 'Failed to load signer credentials.' }, { status: 500 });
    }

    if (!signerRow || !signerRow.private_key || typeof signerRow.fid !== 'number') {
      return NextResponse.json({ message: 'Farcaster signer not linked for this user.' }, { status: 400 });
    }

    const privateKey = signerRow.private_key;
    const fid = Number(signerRow.fid);
    if (Number.isNaN(fid)) {
      return NextResponse.json({ message: 'Stored Farcaster fid is invalid.' }, { status: 500 });
    }

    const curatorUsername =
      recommendation.users?.farcaster_username ||
      recommendation.users?.username ||
      recommendation.curator_address.slice(0, 6);

    const text = `🎵 ${recommendation.song_title} by ${recommendation.artist}\nCurated by @${curatorUsername}`;
    const frameUrl = `${APP_BASE_URL}/api/frame/${encodeURIComponent(recommendation.id)}`;

    const result = await publishCast(fid, privateKey, text, frameUrl);

    return NextResponse.json({ hash: result.hash }, { status: 200 });
  } catch (error) {
    console.error('Failed to publish Farcaster cast:', error);
    return NextResponse.json({ message: 'Failed to publish cast.' }, { status: 500 });
  }
}
