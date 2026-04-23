import { PlaywrightBrowser } from '../infrastructure/browser/PlaywrightBrowser';
import { config } from '../shared/config';

async function main() {
  const browser = new PlaywrightBrowser();
  
  console.log('🔄 Iniciando navegador...');
  await browser.initialize();

  console.log(`🔄 Navegando a ${config.baseUrl}${config.loginUrl}...`);
  await browser.navigateTo(config.loginUrl);

  console.log('📄 Capturando HTML de la página de login...');
  const html = await browser.captureHtml();

  console.log('💾 Guardando HTML en output/login.html...');
  const fs = require('fs');
  const dir = './output';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(`${dir}/login.html`, html);

  console.log('✅ HTML capturado exitosamente!');
  console.log('   Guardado en: output/login.html');

  await browser.close();
}

main().catch(console.error);