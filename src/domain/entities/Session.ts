export interface Session {
  id: string;
  isAuthenticated: boolean;
  cookies: any[];
  userAgent: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  session: Session;
  error?: string;
}