import { Session, LoginCredentials, LoginResult } from '../entities/Session';

export interface SessionRepository {
  createSession(): Promise<Session>;
  saveSession(session: Session): Promise<void>;
  getSession(id: string): Promise<Session | null>;
  deleteSession(id: string): Promise<void>;
  login(credentials: LoginCredentials): Promise<LoginResult>;
  logout(sessionId: string): Promise<void>;
}