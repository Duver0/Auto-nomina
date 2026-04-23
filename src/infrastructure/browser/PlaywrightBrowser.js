const { chromium } = require('playwright');
const config = require('../../shared/config');

class PlaywrightBrowser {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await chromium.launch({
      headless: config.headless,
    });
    const context = await this.browser.newContext();
    this.page = await context.newPage();
  }

  async navigateTo(path) {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    const url = config.baseUrl + path;
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeout,
    });
  }

  async getPage() {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    return this.page;
  }

  async captureHtml() {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    return await this.page.content();
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = { PlaywrightBrowser };