const { PlaywrightBrowser } = require('../../infrastructure/browser/PlaywrightBrowser');
const config = require('../../shared/config');

const CREDENTIALS = {
  username: '***USUARIO***',
  password: '***CLAVE***',
};

async function main() {
  const browser = new PlaywrightBrowser();
  
  console.log('🔄 Iniciando navegador...');
  await browser.initialize();

  console.log(`🔄 Navegando a ${config.baseUrl}${config.loginUrl}...`);
  await browser.navigateTo(config.loginUrl);

  const page = await browser.getPage();
  
  console.log(`🔐 Iniciando sesión con usuario: ${CREDENTIALS.username}`);
  await page.fill(config.selectors.username, CREDENTIALS.username);
  await page.fill(config.selectors.password, CREDENTIALS.password);
  
  console.log('🔄 Haciendo clic en botón Ingresar...');
  await page.click(config.selectors.submitButton);

  console.log('⏳ Esperando respuesta del servidor...');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  console.log('📄 Capturando HTML después del login...');
  const html = await browser.captureHtml();

  console.log('💾 Guardando HTML en output/afterLogin.html...');
  const fs = require('fs');
  const dir = './output';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(`${dir}/afterLogin.html`, html);

  console.log('✅ Login ejecutado!');
  console.log('   HTML guardado en: output/afterLogin.html');

  await browser.close();
}

main().catch(console.error);