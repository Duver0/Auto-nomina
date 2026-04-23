# Auto-nomina

Automatización para descargar comprobantes de nómina del portal PSP de la Policía Nacional de Colombia.

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
npx playwright install chromium
```

## Uso

```bash
npm start
```

## Estructura

```
src/
├── domain/           # Entidades y casos de uso
├── infrastructure/    # Implementación del navegador
├── presentation/     # CLI y scripts
└── shared/           # Configuración compartida
```