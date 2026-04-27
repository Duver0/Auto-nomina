const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const config = require('../../shared/config');
const OUTPUT_PATH = './output';

const CREDENTIALS = {
  username: process.env.USERNAME || '***USUARIO***',
  password: process.env.PASSWORD || '***CLAVE***',
};

function extraerPeriodo(nombre) {
  const match = nombre.toLowerCase().match(/(\w+)\s+(\d{4})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return 'desconocido';
}

// textFilter: regex to match desired dropdown item, or null to pick most recent (nth 1)
async function downloadNomina(page, option, filePrefix, textFilter, downloadPath) {
  const label = textFilter ? textFilter.toString() : `opción ${option}`;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📥 DESCARGANDO: ${filePrefix.toUpperCase()} (v_p=${option})`);
  console.log('='.repeat(50));

  const url = `/frm_rpt_nomina.aspx?v_p=${option}`;
  console.log(`🔄 Navegando a ${url}...`);
  await page.goto(config.baseUrl + url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('🔽 Abriendo dropdown Chosen...');
  await page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen a.chosen-single').click();
  await page.waitForTimeout(2000);

  const items = page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen .chosen-results li');
  const count = await items.count();

  let targetItem = null;
  let periodoNombre = null;

  if (textFilter) {
    // Scan all items for first match (dropdown is ordered most-recent first)
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (textFilter.test(text)) {
        targetItem = items.nth(i);
        periodoNombre = text.trim();
        break;
      }
    }
    if (!targetItem) {
      console.log(`   ⚠️ No se encontró item que coincida con: ${label}`);
      return null;
    }
  } else {
    targetItem = items.nth(1);
    periodoNombre = (await targetItem.textContent()).trim();
  }

  const periodoCodigo = extraerPeriodo(periodoNombre);
  console.log(`   ✓ Período encontrado: ${periodoNombre}`);

  console.log('🔽 Seleccionando opción...');
  await targetItem.click();
  await page.waitForTimeout(2000);

  console.log('🔄 Iniciando descarga...');
  const downloadPromise = page.waitForEvent('download').catch(() => null);

  await page.click('#ctl00_ContentPlaceHolder1_btnConsultar');
  await page.waitForTimeout(5000);

  const download = await downloadPromise;
  if (download) {
    const filename = `${filePrefix}-${periodoCodigo}.pdf`;
    const filepath = path.join(downloadPath, filename);
    await download.saveAs(filepath);
    console.log(`   ✅ Descargado: ${filename}`);
    return filename;
  } else {
    console.log('   ⚠️ No se detectó descarga');
    return null;
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
  }

  console.log('🔄 Iniciando navegador...');
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  console.log(`🔄 Navegando a ${config.baseUrl}${config.loginUrl}...`);
  await page.goto(config.baseUrl + config.loginUrl, { waitUntil: 'domcontentloaded' });

  console.log(`🔐 Iniciando sesión con usuario: ${CREDENTIALS.username}...`);
  await page.fill('#txtUsuario', CREDENTIALS.username);
  await page.fill('#txtClave', CREDENTIALS.password);
  await page.click('#btnIngresar');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  console.log('🔐 Sesión iniciada correctamente');

  // Colillas ordinarias
  await downloadNomina(page, '1', 'nomina1', null, OUTPUT_PATH);
  await downloadNomina(page, '2', 'nomina2', null, OUTPUT_PATH);

  // Prima de servicio (ambas pensiones)
  const filtroPrima = /PRIMA DE SERVICIO DE PENSIONADOS-TEGEN/i;
  await downloadNomina(page, '1', 'prima1', filtroPrima, OUTPUT_PATH);
  await downloadNomina(page, '2', 'prima2', filtroPrima, OUTPUT_PATH);

  // Retroactivo (solo pensión 1)
  const filtroRetroactivo = /NOMINA DE RETROACTIVO DE PENSIONADOS-TEGEN/i;
  await downloadNomina(page, '1', 'retroactivo', filtroRetroactivo, OUTPUT_PATH);

  console.log('\n✅ Proceso completado!');
  await browser.close();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});