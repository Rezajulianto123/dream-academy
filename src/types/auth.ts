export interface UserSafe {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at?: Date | string;
}

export interface AuthResponseData {
  user: UserSafe;
  token: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
