const { chromium } = require('playwright');
const config = require('../../shared/config');
const fs = require('fs');

const CREDENTIALS = {
  username: '***USUARIO***',
  password: '***CLAVE***',
};

const DOWNLOAD_PATH = './output';

async function main() {
  console.log('🔄 Iniciando navegador...');
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    acceptDownloads: true,
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

  console.log('🔽 Abriendo dropdown con JavaScript...');
  await page.evaluate(() => {
    const select = document.getElementById('ctl00_ContentPlaceHolder1_ddlNomina');
    const chosen = document.getElementById('ctl00_ContentPlaceHolder1_ddlNomina_chosen');
    if (chosen) {
      const event = new MouseEvent('click', { bubbles: true });
      chosen.querySelector('a.chosen-single').dispatchEvent(event);
    }
  });
  await page.waitForTimeout(1500);

  console.log('🔽 Hacer clic en opción ABRIL 2026 con JavaScript...');
  await page.evaluate(() => {
    const results = document.querySelectorAll('#ctl00_ContentPlaceHolder1_ddlNomina_chosen .chosen-results li');
    if (results.length > 1) {
      results[1].click();
    }
  });
  await page.waitForTimeout(2000);

  const selectedText = await page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen .chosen-single span').textContent();
  console.log('   ✓ Texto seleccionado:', selectedText);

  const selectValue = await page.evaluate(() => {
    const select = document.getElementById('ctl00_ContentPlaceHolder1_ddlNomina');
    return select ? select.value : 'N/A';
  });
  console.log('   ✓ Valor del select:', selectValue);

  console.log('🔄 Haciendo clic en generar...');
  await page.click('#ctl00_ContentPlaceHolder1_btnConsultar');
  await page.waitForTimeout(5000);

  console.log('📄 Capturando HTML después de generar...');
  const html = await page.content();
  fs.writeFileSync(`${DOWNLOAD_PATH}/afterGenerate3.html`, html);
  console.log('   Guardado en output/afterGenerate3.html');

  await browser.close();
  console.log('✅ Completed!');
}

main().catch(console.error);