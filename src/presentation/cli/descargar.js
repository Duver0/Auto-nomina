const { chromium } = require('playwright');
const config = require('../../shared/config');
const fs = require('fs');

const CREDENTIALS = {
  username: '***USUARIO***',
  password: '***CLAVE***',
};

const OUTPUT_PATH = './output';

function extraerPeriodo(nombre) {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const match = nombre.toLowerCase().match(/(\w+)\s+(\d{4})/);
  if (match) {
    const mes = match[1];
    const anio = match[2];
    return `${mes}-${anio}`;
  }
  return 'desconocido';
}

async function downloadNomina(page, option, downloadPath) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📥 DESCARGANDO OPCIÓN ${option}`);
  console.log('='.repeat(50));

  const url = `/frm_rpt_nomina.aspx?v_p=${option}`;
  console.log(`🔄 Navegando a ${url}...`);
  await page.goto(config.baseUrl + url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('🔽 Abriendo dropdown Chosen...');
  await page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen a.chosen-single').click();
  await page.waitForTimeout(2000);

  console.log('🔽 Obteniendo nombre del período más reciente...');
  const periodoNombre = await page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen .chosen-results li').nth(1).textContent();
  const periodoCodigo = extraerPeriodo(periodoNombre);
  console.log(`   ✓ Período: ${periodoNombre}`);

  console.log('🔽 Seleccionando primera opción...');
  await page.locator('#ctl00_ContentPlaceHolder1_ddlNomina_chosen .chosen-results li').nth(1).click();
  await page.waitForTimeout(2000);

  console.log('🔄 Iniciando descarga...');
  const downloadPromise = page.waitForEvent('download').catch(() => null);
  
  await page.click('#ctl00_ContentPlaceHolder1_btnConsultar');
  
  await page.waitForTimeout(5000);
  
  const download = await downloadPromise;
  if (download) {
    const filename = `nomina${option}-${periodoCodigo}.pdf`;
    const filepath = `${downloadPath}/${filename}`;
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
  const context = await browser.newContext({
    acceptDownloads: true,
  });
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

  await downloadNomina(page, '1', OUTPUT_PATH);
  await downloadNomina(page, '2', OUTPUT_PATH);

  console.log('\n✅ Proceso completado!');
  
  await browser.close();
}

main().catch(console.error);