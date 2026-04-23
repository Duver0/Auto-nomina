const { chromium } = require('playwright');
const config = require('../../shared/config');
const fs = require('fs');

const CREDENTIALS = {
  username: '***USUARIO***',
  password: '***CLAVE***',
};

const DOWNLOAD_PATH = './output';

async function main() {
  console.log('🔄 Iniciando navegador con logging...');
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    acceptDownloads: true,
  });
  const page = await context.newPage();

  page.on('request', request => {
    if (request.url().includes('aspx') || request.url().includes('Report')) {
      console.log('📤 Request:', request.method(), request.url().split('?')[0].slice(-30));
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('aspx') || response.url().includes('Report')) {
      console.log('📥 Response:', response.status(), response.url().split('?')[0].slice(-30));
    }
  });

  console.log(`🔄 Navegando a ${config.baseUrl}${config.loginUrl}...`);
  await page.goto(config.baseUrl + config.loginUrl, { waitUntil: 'domcontentloaded' });

  console.log(`🔐 Iniciando sesión...`);
  await page.fill('#txtUsuario', CREDENTIALS.username);
  await page.fill('#txtClave', CREDENTIALS.password);
  await page.click('#btnIngresar');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  console.log('🔄 Navegando a opción 2 (v_p=2 - Certificado y Desprendible)...');
  await page.goto(config.baseUrl + '/frm_rpt_nomina.aspx?v_p=2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('🔽 Abriendo dropdown Chosen...');
  await page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen a.chosen-single').click();
  await page.waitForTimeout(2000);

  console.log('🔽 Seleccionando primera opción...');
  await page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen .chosen-results li').nth(1).click();
  await page.waitForTimeout(2000);

  const selectedValue = await page.evaluate(() => {
    const select = document.getElementById('ctl00_ContentPlaceHolder1_ddlNomina');
    return select?.value;
  });
  console.log(`   ✓ Valor seleccionado: ${selectedValue}`);

  console.log('🔄 Click en generar y esperando descarga...');
  const downloadPromise = page.waitForEvent('download').catch(() => null);
  
  await page.click('#ctl00_ContentPlaceHolder1_btnConsultar');
  console.log('   ⏳ Esperando...');
  
  await page.waitForTimeout(5000);
  
  const download = await downloadPromise;
  if (download) {
    console.log(`   ✓ Descarga detectada: ${download.suggestedFilename()}`);
    const path = `${DOWNLOAD_PATH}/nomina_opcion2.pdf`;
    await download.saveAs(path);
    console.log(`   ✅ Guardado en: ${path}`);
  } else {
    console.log('   ⚠️ No se detectó descarga automática');
  }

  console.log('📄 Capturando HTML final...');
  const html = await page.content();
  fs.writeFileSync(`${DOWNLOAD_PATH}/afterGenerateOption2.html`, html);
  console.log('   Guardado en output/afterGenerateOption2.html');

  await browser.close();
  console.log('✅ Completed!');
}

main().catch(console.error);