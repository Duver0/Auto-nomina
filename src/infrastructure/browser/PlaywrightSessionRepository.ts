import { v4 as uuidv4 } from 'uuid';
import { PlaywrightBrowser } from '../browser/PlaywrightBrowser';
import { SessionRepository } from '../../domain/repositories/SessionRepository';
import { Session, LoginCredentials, LoginResult } from '../../domain/entities/Session';
import { config } from '../../shared/config';

export class PlaywrightSessionRepository implements SessionRepository {
  private browser: PlaywrightBrowser;
  private currentSession: Session | null = null;

  constructor() {
    this.browser = new PlaywrightBrowser();
  }

  async createSession(): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      isAuthenticated: false,
      cookies: [],
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      createdAt: new Date(),
    };
    this.currentSession = session;
    return session;
  }

  async saveSession(session: Session): Promise<void> {
    this.currentSession = session;
  }

  async getSession(id: string): Promise<Session | null> {
    return this.currentSession;
  }

  async deleteSession(id: string): Promise<void> {
    this.currentSession = null;
  }

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      await this.browser.initialize();
      await this.browser.navigateTo(config.loginUrl);

      const page = await this.browser.getPage();
      await page.fill(config.selectors.username, credentials.username);
      await page.fill(config.selectors.password, credentials.password);
      await page.click(config.selectors.submitButton);

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const session: Session = {
        id: this.currentSession?.id || uuidv4(),
        isAuthenticated: true,
        cookies: [],
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
      };

      return {
        success: true,
        session,
      };
    } catch (error: any) {
      return {
        success: false,
        session: this.currentSession || {
          id: uuidv4(),
          isAuthenticated: false,
          cookies: [],
          userAgent: '',
          createdAt: new Date(),
        },
        error: error.message,
      };
    }
  }

  async logout(sessionId: string): Promise<void> {
    await this.browser.close();
    this.currentSession = null;
  }
}