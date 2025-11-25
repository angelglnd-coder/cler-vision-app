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

### Windows

```bash
# Development build
$ npm run build:win

# Production build (uses .env.production)
$ npm run build:win:prod
```

### macOS

```bash
# Development build
$ npm run build:mac

# Production build (uses .env.production)
$ npm run build:mac:prod
```

### Linux

```bash
# Development build
$ npm run build:linux

# Production build (uses .env.production)
$ npm run build:linux:prod
```

## Production Deployment Checklist

Before deploying to production, ensure:

- [ ] `.env.production` file is configured with production API URL
- [ ] Backend API is accessible from client machines
- [ ] Code signing certificate is properly configured (if using)
- [ ] The installer is tested on a clean machine
- [ ] All features are tested with production API endpoints

## Application Features

- Work order creation and management
- Queue file tracking and processing
- Barcode generation
- Excel import/export functionality
- Batch printing support
- Real-time status updates
