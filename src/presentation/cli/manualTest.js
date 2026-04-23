const { chromium } = require('playwright');
const config = require('../../shared/config');
const fs = require('fs');

const CREDENTIALS = {
  username: '***USUARIO***',
  password: '***CLAVE***',
};

const DOWNLOAD_PATH = './output';

async function main() {
  console.log('🔄 Iniciando navegador (headless=false)...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log(`🔄 Navegando a ${config.baseUrl}${config.loginUrl}...`);
  await page.goto(config.baseUrl + config.loginUrl, { waitUntil: 'domcontentloaded' });

  console.log(`🔐 Iniciando sesión...`);
  await page.fill('#txtUsuario', CREDENTIALS.username);
  await page.fill('#txtClave', CREDENTIALS.password);
  await page.click('#btnIngresar');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  console.log('🔄 Navegando a opción 1...');
  await page.goto(config.baseUrl + '/frm_rpt_nomina.aspx?v_p=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('⏸️ El navegador está abierto. Por favor selecciona manualmente.');
  console.log('   1. Abre el dropdown de nómina');
  console.log('   2. Selecciona "ABRIL 2026"');
  console.log('   3. Haz clic en "Generar Certificado Mesadas"');
  console.log('   4. Cuando termines, vuelve aquí y presionar Enter');
  
  await new Promise(resolve => {
    process.stdout.resume();
    process.stdin.once('data', resolve);
  });

  console.log('📄 Capturando HTML...');
  const html = await page.content();
  fs.writeFileSync(`${DOWNLOAD_PATH}/manualTest.html`, html);
  console.log('   Guardado en output/manualTest.html');

  const downloads = await context.downloads();
  console.log('   Descargas iniciadas:', downloads.length);

  await browser.close();
}

main().catch(console.error);