# CLER Vision App

A desktop application for managing work orders and queue files in the optical lens manufacturing process.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)

## Project Setup

### Install

```bash
$ npm install
```

## Environment Configuration

The application requires an API backend. Configure the API URL using environment files:

### Development

Create a `.env` file in the root directory (or use the existing one):

```env
RENDERER_VITE_API_BASE=http://localhost:4000/api
```

### Production

For production builds, the app uses `.env.production`:

```env
RENDERER_VITE_API_BASE=http://192.168.167.77:4000/api
```

**Note:** Environment files (`.env`, `.env.production`) are gitignored. Use `.env.example` as a template.

## Development

```bash
$ npm run dev
```

## Building for Production

### Prerequisites

Before building for production:

1. **Update version** in `package.json` (e.g., from `0.0.0` to `1.0.0`)
2. **Update CHANGELOG.md** with release notes
3. **Configure environment**: Create/update `.env.production`

```env
RENDERER_VITE_API_BASE=http://137.184.234.57:3000/api
RENDERER_VITE_APP_ENV=production
```

### Build Commands

The production build process includes automatic validation:
- Pre-build script checks version and metadata
- TypeScript compilation and type checking
- Svelte component validation
- Electron packaging with environment-specific settings

#### Windows

```bash
# Production build (includes validation)
$ npm run build:win:prod

# Staging build
$ npm run build:win:staging

# Output: dist/cler-vision-app-1.0.0-setup.exe
```

#### macOS

```bash
# Production build
$ npm run build:mac:prod

# Output: dist/cler-vision-app-1.0.0.dmg
```

#### Linux

```bash
# Production build
$ npm run build:linux:prod

# Output: dist/cler-vision-app-1.0.0.AppImage
```

### Build Output

Production builds generate:
- **Installer**: `dist/cler-vision-app-{version}-setup.exe` (Windows)
- **Auto-update files**: `dist/latest.yml`, `dist/*.blockmap`
- **Unpacked app**: `dist/win-unpacked/` (for testing)

### Auto-Updates

**Update Server:** `https://updates.137.184.234.57.nip.io/updates/clervision/prod`

To deploy updates:
1. Build production version with new version number
2. Upload installer and auto-update files to update server:
   - `cler-vision-app-{version}-setup.exe`
   - `latest.yml`
   - `*.blockmap` files
3. Existing installations will automatically check for updates

## Production Deployment Checklist

Before deploying to production, ensure:

- [ ] Version updated in `package.json` (not `0.0.0`)
- [ ] CHANGELOG.md updated with release notes
- [ ] Package metadata updated (author, homepage, description)
- [ ] `.env.production` configured with production API URL
- [ ] Pre-build validation passes (`npm run prebuild:prod`)
- [ ] Build completes successfully
- [ ] Installer tested on clean Windows machine
- [ ] Application connects to production API
- [ ] All core features tested (work orders, calculations, exports)
- [ ] Auto-update files uploaded to update server
- [ ] Security documentation reviewed (see `docs/SECURITY.md`)

### Known Limitations (v1.0.0)

- **Code signing not enabled**: Users will see Windows SmartScreen warnings on first run
  - Users must click "More info" → "Run anyway"
  - Planned for v1.1.0 with proper certificates
- **HTTP API**: Production API uses HTTP (not HTTPS) for internal network deployment
- **Sandbox disabled**: See `docs/SECURITY.md` for security implications

## Application Features

- Work order creation and management
- Queue file tracking and processing
- Barcode generation
- Excel import/export functionality
- Batch printing support
- Real-time status updates
