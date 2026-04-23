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

  console.log('🔄 Navegando a opción 1 (v_p=1)...');
  await page.goto(config.baseUrl + '/frm_rpt_nomina.aspx?v_p=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('🔽 Abriendo dropdown Chosen...');
  const dropdownAnchor = page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen a.chosen-single');
  await dropdownAnchor.click();
  await page.waitForTimeout(2000);

  console.log('🔽 Esperando opciones y seleccionando primera (index 1)...');
  const dropdownList = page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen .chosen-results');
  await dropdownList.waitFor({ state: 'visible', timeout: 5000 });
  
  const firstOption = page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen .chosen-results li').nth(1);
  await firstOption.click();
  await page.waitForTimeout(2000);

  const selectedValue = await page.evaluate(() => {
    const select = document.getElementById('ctl00_ContentPlaceHolder1_ddlNomina');
    return select?.value;
  });
  console.log(`   ✓ Valor seleccionado: ${selectedValue}`);

  if (!selectedValue || selectedValue === '0') {
    console.log('⚠️ La selección falló. Probando con force...');
    await page.evaluate(() => {
      const select = document.getElementById('ctl00_ContentPlaceHolder1_ddlNomina');
      if (select) {
        select.value = '2682';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(2000);
  }

  console.log('🔄 Click en generar...');
  await page.click('#ctl00_ContentPlaceHolder1_btnConsultar');
  await page.waitForTimeout(8000);

  console.log('📄 Capturando HTML...');
  const html = await page.content();
  fs.writeFileSync(`${DOWNLOAD_PATH}/afterGenerateFinal.html`, html);
  console.log('   Guardado en output/afterGenerateFinal.html');

  const pageUrl = page.url();
  console.log(`   URL actual: ${pageUrl}`);

  await browser.close();
  console.log('✅ Completed!');
}

main().catch(console.error);