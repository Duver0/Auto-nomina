const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const config = require('../../shared/config');
const OUTPUT_PATH = './output';
const MAX_RETRIES = 2;

const CREDENTIALS = {
  username: process.env.NOMINA_USERNAME,
  password: process.env.NOMINA_PASSWORD,
};

if (!CREDENTIALS.username || !CREDENTIALS.password) {
  console.error('❌ Error: Se requieren las variables de entorno NOMINA_USERNAME y NOMINA_PASSWORD');
  process.exit(1);
}

function extraerPeriodo(nombre) {
  const match = nombre.toLowerCase().match(/(\w+)\s+(\d{4})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return 'desconocido';
}

async function withRetry(fn, label) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      if (result === null && attempt < MAX_RETRIES) {
        console.log(`   🔁 Reintentando (${attempt}/${MAX_RETRIES - 1})...`);
        continue;
      }
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        console.log(`   🔁 Reintentando por error: ${err.message.substring(0, 80)} (${attempt}/${MAX_RETRIES - 1})...`);
      }
    }
  }
  console.log(`   ❌ Falló después de ${MAX_RETRIES} intentos: ${lastError.message.substring(0, 80)}`);
  return null;
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

  const consoleErrors = [];
  const consoleWarnings = [];
  const responses = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('response', resp => responses.push({ url: resp.url(), ct: resp.headers()['content-type'] || '' }));

  // Portal serves PDFs in two ways:
  //   1. attachment (Content-Disposition: attachment) → triggers download event
  //   2. inline navigation (page navigates to PDF URL) → must intercept response body
  // Portal serves PDFs two ways:
  //   1. attachment → triggers download event
  //   2. inline navigation → response body must be captured immediately before page discards it
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    .then(d => ({ type: 'download', value: d }))
    .catch(() => null);

  const pdfResponsePromise = page.waitForResponse(
    r => r.status() === 200 && (r.headers()['content-type'] || '').includes('pdf'),
    { timeout: 10000 }
  ).then(async r => {
    const body = await r.body(); // capture immediately before navigation discards resource
    return { type: 'response', body };
  }).catch(() => null);

  await page.click('#ctl00_ContentPlaceHolder1_btnConsultar');

  const result = await Promise.race([
    downloadPromise,
    pdfResponsePromise,
    new Promise(resolve => setTimeout(() => resolve(null), 13000)),
  ]);

  const filename = `${filePrefix}-${periodoCodigo}.pdf`;
  const filepath = path.join(downloadPath, filename);

  if (result?.type === 'download') {
    await result.value.saveAs(filepath);
    console.log(`   ✅ Descargado (attachment): ${filename}`);
    return filename;
  } else if (result?.type === 'response') {
    fs.writeFileSync(filepath, result.body);
    console.log(`   ✅ Descargado (inline PDF): ${filename}`);
    return filename;
  } else {
    console.log('   ⚠️ No se detectó descarga');
    if (consoleErrors.length) {
      console.log('   🔍 Errores en consola del navegador:');
      consoleErrors.forEach(e => console.log(`      - ${e}`));
    }
    if (responses.length > 0) {
      console.log('   🔍 Últimas respuestas HTTP (no triviales):');
      responses
        .filter(r => !r.url.match(/\.(css|js|png|jpg|jpeg|gif|woff|ico|svg)/))
        .slice(-10)
        .forEach(r => console.log(`      - ${r.url.substring(0, 100)} [${r.ct}]`));
    }
    return null;
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
  }

  console.log('🔄 Iniciando navegador...');
  const browser = await chromium.launch({
    headless: config.headless,
    args: config.browserArgs || [],
  });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`   🌐 [BROWSER ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.log(`   🌐 [PAGE ERROR] ${err.message}`);
  });

  async function loginWithRetry() {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Navegando a ${config.baseUrl}${config.loginUrl}...`);
        await page.goto(config.baseUrl + config.loginUrl, { waitUntil: 'domcontentloaded' });
        console.log(`🔐 Iniciando sesión con usuario: ${CREDENTIALS.username}...`);
        await page.fill('#txtUsuario', CREDENTIALS.username);
        await page.fill('#txtClave', CREDENTIALS.password);
        await page.click('#btnIngresar');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3000);
        console.log('🔐 Sesión iniciada correctamente');
        return;
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          console.log(`   🔁 Reintentando login (${attempt}/${MAX_RETRIES - 1})...`);
        } else {
          throw new Error(`Login falló después de ${MAX_RETRIES} intentos: ${err.message}`);
        }
      }
    }
  }

  await loginWithRetry();

  async function descargarWrapper(option, filePrefix, textFilter) {
    return withRetry(() => downloadNomina(page, option, filePrefix, textFilter, OUTPUT_PATH), filePrefix);
  }

  // Colillas ordinarias
  await descargarWrapper('1', 'nomina1', null);
  await descargarWrapper('2', 'nomina2', null);

  // Prima de servicio (ambas pensiones)
  const filtroPrima = /PRIMA DE/i;
  await descargarWrapper('1', 'prima1', filtroPrima);
  await descargarWrapper('2', 'prima2', filtroPrima);

  // Retroactivo (solo pensión 2 — no existe en v_p=1)
  const filtroRetroactivo = /NOMINA\s+DE\s+RETROACTIVO\s+DE\s+PENSIONADOS-TEGEN/i;
  await descargarWrapper('2', 'retroactivo', filtroRetroactivo);

  console.log('\n✅ Proceso completado!');
  await browser.close();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});