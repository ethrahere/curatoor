import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type RecommendationRow = {
  id: string;
  curator_address: string;
  music_url: string;
  song_title: string;
  artist: string;
  review: string;
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
const FALLBACK_IMAGE_URL = `${APP_BASE_URL}/image-url.png`;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractYoutubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.split('/')[1] ?? null;
    }

    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.searchParams.has('v')) {
        return parsed.searchParams.get('v');
      }
      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      const watchIndex = pathSegments.indexOf('watch');
      if (watchIndex !== -1 && parsed.searchParams.has('v')) {
        return parsed.searchParams.get('v');
      }
      const shortIndex = pathSegments.indexOf('shorts');
      if (shortIndex !== -1 && pathSegments[shortIndex + 1]) {
        return pathSegments[shortIndex + 1];
      }
    }
  } catch (error) {
    console.warn('Failed to parse YouTube URL for frame thumbnail:', error);
  }

  return null;
}

function getThumbnailUrl(musicUrl: string): string {
  const youtubeId = extractYoutubeId(musicUrl);
  if (youtubeId) {
    return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  }
  return FALLBACK_IMAGE_URL;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string | string[] | undefined>> }
) {
  const resolvedParams = await params;
  const idParam = resolvedParams?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam ?? '';

  if (!id) {
    return NextResponse.json({ message: 'Missing recommendation id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('recommendations')
    .select(
      `id, curator_address, music_url, song_title, artist, review,
       users:users!recommendations_curator_address_fkey(username, farcaster_username)`
    )
    .eq('id', id)
    .maybeSingle();

  const recommendation = (data as RecommendationRow | null) ?? null;

  if (error) {
    console.error('Failed to fetch recommendation for frame:', error);
    return NextResponse.json({ message: 'Failed to fetch recommendation' }, { status: 500 });
  }

  if (!recommendation) {
    return NextResponse.json({ message: 'Recommendation not found' }, { status: 404 });
  }

  const title = recommendation.song_title;
  const artist = recommendation.artist;
  const playUrl = recommendation.music_url;
  const thumbnail = getThumbnailUrl(playUrl);
  const curatorUsername =
    recommendation.users?.farcaster_username ||
    recommendation.users?.username ||
    recommendation.curator_address.slice(0, 6);

  const escapedTitle = escapeHtml(title);
  const escapedArtist = escapeHtml(artist);
  const escapedCurator = escapeHtml(curatorUsername);
  const escapedThumbnail = escapeHtml(thumbnail);
  const escapedPlayUrl = escapeHtml(playUrl);

  const frameUrl = `${APP_BASE_URL}/api/frame/${encodeURIComponent(id)}`;
  const tipUrl = `${APP_BASE_URL}/api/tip/${encodeURIComponent(id)}`;
  const escapedFrameUrl = escapeHtml(frameUrl);
  const escapedTipUrl = escapeHtml(tipUrl);

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="🎵 ${escapedTitle} - ${escapedArtist}" />
    <meta property="og:description" content="Curated by @${escapedCurator}" />
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${escapedThumbnail}" />
    <meta property="fc:frame:button:1" content="▶️ Play" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="${escapedPlayUrl}" />
    <meta property="fc:frame:button:2" content="💸 Tip" />
    <meta property="fc:frame:button:2:action" content="post" />
    <meta property="fc:frame:button:2:target" content="${escapedTipUrl}" />
    <meta property="fc:frame:post_url" content="${escapedFrameUrl}" />
  </head>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
