import jwt, { SignOptions, Secret } from "jsonwebtoken";
import { JwtPayload } from "@/types/auth";

const JWT_SECRET: Secret =
  process.env.JWT_SECRET || "dream-academy-default-jwt-secret-key-change-in-production";

export function signToken(
  payload: { userId: string; email: string; role: string },
  expiresIn: SignOptions["expiresIn"] = "7d"
): string {
  const options: SignOptions = {
    expiresIn,
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
