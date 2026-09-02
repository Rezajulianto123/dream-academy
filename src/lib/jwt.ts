import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production environment.');
    }
    return 'dream-academy-default-dev-secret-key-min-32-chars';
  }
  return secret;
}

const DEFAULT_JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'student' | 'admin';
}

export function signToken(payload: TokenPayload, customExpiresIn?: string): string {
  const secret = getJwtSecret();
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: (customExpiresIn || DEFAULT_JWT_EXPIRES_IN) as any,
  };
  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const secret = getJwtSecret();
    const options: VerifyOptions = {
      algorithms: ['HS256'],
    };
    const decoded = jwt.verify(token, secret, options) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
