import { HubRestAPIClient, DEFAULT_HUB_URL } from '@standard-crypto/farcaster-js-hub-rest';

const hubUrl = process.env.FARCASTER_HUB_URL ?? DEFAULT_HUB_URL;

const hubClient = new HubRestAPIClient({ hubUrl });

export async function publishCast(
  fid: number,
  signerPrivateKey: string,
  text: string,
  frameUrl?: string
) {
  const embeds = frameUrl ? [{ url: frameUrl }] : undefined;

  return hubClient.submitCast(
    {
      text,
      embeds,
    },
    fid,
    signerPrivateKey
  );
}
