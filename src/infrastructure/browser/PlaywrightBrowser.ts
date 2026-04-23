import { chromium, Browser, Page } from 'playwright';
import { config } from '../../shared/config';

export class PlaywrightBrowser {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: config.headless,
    });
    const context = await this.browser.newContext();
    this.page = await context.newPage();
  }

  async navigateTo(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.goto(`${config.baseUrl}${url}`, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeout,
    });
  }

  async getPage(): Promise<Page> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    return this.page;
  }

  async captureHtml(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    return await this.page.content();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}