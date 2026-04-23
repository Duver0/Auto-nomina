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
  
  console.log(`🔐 Iniciando sesión...`);
  await page.fill(config.selectors.username, CREDENTIALS.username);
  await page.fill(config.selectors.password, CREDENTIALS.password);
  await page.click(config.selectors.submitButton);

  console.log('⏳ Esperando login...');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  console.log('🔄 Navegando a frm_rpt_nomina.aspx?v_p=1 (Opción 1)...');
  await browser.navigateTo('/frm_rpt_nomina.aspx?v_p=1');

  console.log('⏳ Esperando页面...');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  console.log('📄 Capturando HTML de Opción 1...');
  const html = await browser.captureHtml();

  console.log('💾 Guardando en output/opcion1.html...');
  const fs = require('fs');
  const dir = './output';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(`${dir}/opcion1.html`, html);

  console.log('✅ Opción 1 cargado!');
  console.log('   Guardado en: output/opcion1.html');

  await browser.close();
}

main().catch(console.error);