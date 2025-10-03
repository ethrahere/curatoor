import { getPublicKey, utils } from '@noble/ed25519';

export type SignerKeypair = {
  publicKey: string;
  privateKey: string;
};

export async function generateSignerKeypair(): Promise<SignerKeypair> {
  const randomKeyFn =
    typeof (utils as unknown as { randomPrivateKey?: () => Uint8Array }).randomPrivateKey === 'function'
      ? (utils as unknown as { randomPrivateKey: () => Uint8Array }).randomPrivateKey
      : utils.randomSecretKey;

  const privateKeyBytes = randomKeyFn();
  const publicKeyBytes = await getPublicKey(privateKeyBytes);

  const privateKey = `0x${Buffer.from(privateKeyBytes).toString('hex')}`;
  const publicKey = `0x${Buffer.from(publicKeyBytes).toString('hex')}`;

  return { publicKey, privateKey };
}
