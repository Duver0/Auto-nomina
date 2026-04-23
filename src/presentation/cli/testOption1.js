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

  console.log('🔄 Navegando a opción 1 (v_p=1 - Certificado pensión)...');
  await page.goto(config.baseUrl + '/frm_rpt_nomina.aspx?v_p=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('🔽 Abriendo dropdown Chosen...');
  await page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen a.chosen-single').click();
  await page.waitForTimeout(2000);

  console.log('🔽 Seleccionando primera opción...');
  await page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen .chosen-results li').nth(1).click();
  await page.waitForTimeout(2000);

  console.log('🔄 Click en generar y esperando descarga...');
  const downloadPromise = page.waitForEvent('download').catch(() => null);
  
  await page.click('#ctl00_ContentPlaceHolder1_btnConsultar');
  console.log('   ⏳ Esperando...');
  
  await page.waitForTimeout(5000);
  
  const download = await downloadPromise;
  if (download) {
    console.log(`   ✓ Descarga detectada: ${download.suggestedFilename()}`);
    const path = `${DOWNLOAD_PATH}/nomina_opcion1.pdf`;
    await download.saveAs(path);
    console.log(`   ✅ Guardado en: ${path}`);
  } else {
    console.log('   ⚠️ No se detectó descarga automática');
  }

  await browser.close();
  console.log('✅ Completed!');
}

main().catch(console.error);