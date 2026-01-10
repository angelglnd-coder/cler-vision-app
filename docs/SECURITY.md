# Security Configuration

This document outlines the security configuration decisions made for CLER Vision and their rationale.

## Sandbox Disabled

**Setting:** `sandbox: false` in webPreferences
**Location:** [src/main/index.ts:22](../src/main/index.ts#L22)
**Status:** ⚠️ Active in v1.0.0

### Reason
The sandbox is currently disabled to support specific functionality requirements. This decision should be re-evaluated in future releases.

### Security Implications
- Reduced process isolation between renderer and OS
- Increased attack surface if renderer is compromised

### Mitigations in Place
- ✅ **Context Isolation:** ENABLED (default in Electron)
  - Prevents renderer from directly accessing Node.js/Electron APIs
  - All IPC communication goes through secure contextBridge
- ✅ **Node Integration:** DISABLED (default in Electron)
  - Renderer process cannot require() Node.js modules directly
- ✅ **Remote Module:** DISABLED (default in Electron)
  - Deprecated remote module is not enabled
- ✅ **Content Security Policy:** Dynamic CSP based on environment
  - Restricts resource loading to trusted origins
- ✅ **Window Open Handler:** Configured
  - External links open in default browser, not in app

### Future Actions
- [ ] Re-evaluate if sandbox can be enabled with required functionality
- [ ] Document specific features that require sandbox: false
- [ ] Consider alternative approaches that work with sandbox enabled

---

## HTTP API Endpoint

**Production API:** `http://137.184.234.57:3000/api`
**Status:** ✅ Intentional for v1.0.0

### Reason
The application is deployed on an internal network where HTTPS infrastructure is not available. The deployment environment provides security through:
- Network-level access controls
- Not exposed to public internet
- Controlled user access within organization

### Security Implications
- API traffic is not encrypted in transit
- Vulnerable to man-in-the-middle attacks within the internal network
- Credentials and data transmitted in clear text over HTTP

### Mitigations
- Network is secured at infrastructure level
- Application is only accessible to authorized internal users
- Limited to trusted network environment

### Future Actions
- [ ] Consider implementing HTTPS for production API (v1.1.0+)
- [ ] Evaluate SSL certificate options for internal infrastructure
- [ ] Consider VPN or other network-level encryption

---

## Code Signing

**Status:** ❌ Not implemented in v1.0.0
**Impact:** HIGH

### Current State
Code signing is disabled in electron-builder configuration:
- Windows: `sign: false`
- macOS: `notarize: false`

### Implications
- **Windows:** Users will see Windows SmartScreen warnings on first run
  - "Windows protected your PC" dialog
  - Requires clicking "More info" → "Run anyway"
- **macOS:** Application will show as from "unidentified developer"
  - Requires users to right-click → Open to bypass Gatekeeper

### Impact on Users
- Reduces perceived trust and professionalism
- Additional friction during installation
- Some corporate environments may block unsigned applications
- Windows Defender may be more aggressive with unsigned apps

### Planned Actions
- [ ] **v1.1.0:** Acquire Windows code signing certificate
  - Estimate: $100-400/year for certificate
  - Consider: EV Code Signing for immediate SmartScreen reputation
- [ ] **v1.1.0:** Acquire Apple Developer account for macOS notarization
  - Estimate: $99/year
- [ ] Update electron-builder.prod.yml with signing configuration
- [ ] Set up CI/CD secure credential storage
- [ ] Test signed builds before release

---

## Content Security Policy (CSP)

**Implementation:** Dynamic CSP based on environment
**Location:** [src/main/csp.ts](../src/main/csp.ts)

### Production CSP
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://cdn.svar.dev;
img-src 'self' data: blob:;
font-src 'self' data: https://cdn.svar.dev;
connect-src 'self' http://137.184.234.57:3000;
```

### CSP Policies

#### `style-src 'unsafe-inline'`
**Status:** ⚠️ Required
**Reason:** Svelte Material UI and inline styles
**Alternative:** Could implement nonce-based CSP in future

#### `connect-src` - Environment Specific
**Status:** ✅ Secure
**Implementation:**
- Development: Includes localhost and HMR websockets
- Production: Only includes production API endpoint
- Staging: Only includes staging API endpoint

### Security Benefits
- Prevents XSS attacks by restricting script sources
- Restricts API calls to authorized endpoints only
- Prevents data exfiltration to unauthorized domains
- Exposes only necessary infrastructure per environment

---

## Auto-Update Security

**Update Server:** `https://updates.137.184.234.57.nip.io/updates/clervision/prod`
**Status:** ✅ HTTPS Enabled

### Security Features
- Update server uses HTTPS
- electron-updater validates signatures (when code signing enabled)
- Updates checked periodically in background
- Users notified before installing updates

### Future Improvements
- [ ] Enable signature validation when code signing implemented
- [ ] Consider update server authentication
- [ ] Implement rollback mechanism for failed updates

---

## Recommended Security Practices for Users

### Installation
1. Only download installers from official distribution channels
2. Verify installer integrity if hash provided
3. Review Windows SmartScreen warnings carefully

### Usage
1. Keep application updated to latest version
2. Use application only on trusted networks
3. Report security concerns to: security@clervision.com (if applicable)

### For IT Administrators
1. Consider firewall rules to restrict API endpoint access
2. Use application control/whitelisting if available
3. Monitor for unusual network activity

---

## Security Disclosure

If you discover a security vulnerability, please:
1. **Do not** publicly disclose the issue
2. Email details to: [TO BE CONFIGURED]
3. Include steps to reproduce if possible
4. Allow reasonable time for fix before public disclosure

---

## Version History

### v1.0.0 (2026-01-10)
- Initial security documentation
- Sandbox disabled (documented)
- HTTP API endpoint (documented)
- Code signing not implemented
- Dynamic CSP implementation

---

**Last Updated:** 2026-01-10
**Review Schedule:** Quarterly
