# Auto-nomina

Automatización para descargar comprobantes de nómina del portal PSP de la Policía Nacional de Colombia. Ejecuta un script que se autentica en el portal y descarga los PDFs de colillas de nómina.

## Descripción

El portal PSP (`srvpsp.policia.gov.co:8443`) expone colillas de nómina para pensionados a través de una interfaz ASP.NET. Este proyecto automatiza:

1. Login en el portal con credenciales
2. Selección del período y tipo de nómina desde dropdowns
3. Generación del reporte y captura del PDF resultante
4. Almacenamiento local en `output/`
5. Copia a `docs/downloads/` para distribución via GitHub Pages

### Documentos descargados

| Prefijo | Descripción | v_p |
|---|---|---|
| `nomina1` | Colilla ordinaria - Pensión 1 | 1 |
| `nomina2` | Colilla ordinaria - Pensión 2 | 2 |
| `prima1` | Prima de servicio - Pensión 1 | 1 |
| `prima2` | Prima de servicio - Pensión 2 | 2 |
| `retroactivo` | Retroactivo - Pensión 2 | 2 |

## Requisitos

- Node.js 18+
- Chromium (instalado via Playwright)
- Credenciales del portal PSP

## Instalación

```bash
npm install
npx playwright install chromium
```

## Configuración

Copia el archivo de ejemplo y completa tus credenciales:

```bash
cp .env.example .env
# Edita .env con tus credenciales del portal
```

Variables requeridas:
- `NOMINA_USERNAME` — usuario del portal PSP
- `NOMINA_PASSWORD` — contraseña del portal PSP

## Uso

```bash
# Con variables de entorno
NOMINA_USERNAME=xxx NOMINA_PASSWORD=yyy npm start

# O carga desde .env
export $(grep -v '^#' .env | xargs) && npm start
```

### Comandos disponibles

```bash
npm start    # Ejecutar descarga de nóminas
npm run login # Alias de npm start
```

## GitHub Actions (CI)

El workflow `.github/workflows/descargar-nomina.yml` ejecuta el script automáticamente:

- **Schedule**: cada lunes a las 09:00 UTC
- **Manual**: `workflow_dispatch` para ejecución bajo demanda
- **Push**: también corre en cada push para validar el pipeline

### Secrets requeridos (en GitHub repo)

| Secret | Descripción |
|---|---|
| `NOMINA_USERNAME` | Usuario del portal PSP |
| `NOMINA_PASSWORD` | Contraseña del portal PSP |

## PWA de distribución

`docs/` contiene una PWA estática protegida con contraseña que permite descargar los PDFs generados por el CI:

- `index.html` — página principal (en raíz)
- `css/styles.css` — estilos (en raíz)
- `sw.js` — service worker (en raíz)
- `docs/downloads/` — PDFs generados por el workflow
- `docs/manifest.json` — PWA manifest

## Estructura del proyecto

```
Auto-nomina/
├── index.html              # Página principal PWA
├── css/styles.css         # Estilos
├── sw.js                  # Service worker (PWA)
├── docs/
│   ├── manifest.json      # PWA manifest
│   └── downloads/         # PDFs del CI
├── src/
│   ├── domain/            # Entidades y casos de uso (DDD skeleton)
│   ├── infrastructure/    # Implementación Playwright
│   ├── presentation/cli/  # CLI: descargar.js
│   └── shared/config/     # Configuración centralizada
├── .github/workflows/     # GitHub Actions
├── .env.example          # Plantilla de configuración
└── package.json
```

## Solución de problemas

Si la descarga falla, el script muestra información de diagnóstico:

- Errores en consola del navegador (`🌐 [BROWSER ERROR]`)
- Errores de página JavaScript (`🌐 [PAGE ERROR]`)
- Respuestas HTTP no triviales capturadas durante el intento

Esto ayuda a distinguir si el problema es del código o del portal.