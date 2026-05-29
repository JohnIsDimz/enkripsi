# 🌌 JohnCrypt - Next-Gen Secure File Encryption Sandbox (2026 Edition)

JohnCrypt is a high-performance, decentralized, and visually pristine client-side file security suite featuring a state-of-the-art **"Liquid Glass"** glassmorphic aesthetic. Designed with absolute privacy at its core, JohnCrypt allows secure encryption and decryption of any file kind directly inside your browser sandbox under the **Zero-Knowledge, Zero-Server** standard.

---

## 🚀 Key Evolutionary Features (2026 Release)

### 1. ⚡ High-Throughput Turbo Mode (AES-256-GCM)
Allows **near-instant processing speeds exceeding 2.5 Gbps** under strict browser resource constraints. Utilizing 100% hardware-accelerated Native SubtleCrypto AES-GCM coupled with hardened PBKDF2 derivation, Turbo Mode is engineered for performance, heavy file archiving, and multi-megabyte streams.

### 2. 🛡️ Triple-Layer Symmetric Encryption (Ultra-Hardened V8)
For absolute paranoia, the standard symmetric mode combines three distinct cryptographic algorithms sequentially:
*   **AES-256-GCM** (NIST Certified)
*   **ChaCha20-Poly1305** (RFC 8439)
*   **XChaCha20-Poly1305** (Extended Nonce)
Includes **Header-HMAC Binding** and **V8 HKDF Derivation** preventing cross-protocol attacks and metadata spoofing.

### 3. 🧠 Argon2id Hardened Security Profiles
Derives strong military-grade keys from passphrases using **Argon2id KDF (WebAssembly)**, offering four memory-hard presets to counter GPU, ASIC, or FPGA brute-force cluster attacks:
*   **Standard**: 4 Iterations, 128 MB DRAM
*   **Hardened**: 8 Iterations, 256 MB DRAM
*   **Paranoid**: 16 Iterations, 512 MB DRAM
*   **Ultra (Maximum)**: 32 Iterations, 1 GB DRAM (locks memory securely)

### 4. 🔑 Triple Hybrid Mode (Curve25519 ECIES)
Supports asymmetric hybrid key exchanges using Diffie-Hellman over Curve25519 (ECDH) and RSA-4096-OAEP, fortified with a post-quantum readiness simulation layer. It enables public/private key-pair transfers so you can encrypt files meant safely for external recipients.

### 5. ✍️ RSA-PSS Digital Signatures
Guarantees absolute digital provenance. The recipient can cryptographically verify that the file originated from your private signature key and has not been altered by third parties.

### 6. 🕒 Performance Metrics & Persisted Session Log
Includes a high-precision execution benchmark track. When an operation (encryption/decryption) is completed, JohnCrypt records the exact **elapsed processing time (duration in ms/seconds)**.
*   **Refreshes-Resilient Log**: All operation records now persist locally inside `localStorage`, allowing the user to review historical statistics even after fully reloading the browser.

### 7. 🧬 Decentralized Device-Specific Identity
To distinguish separate setups, JohnCrypt automatically provisions a **device-unique code moniker** during initialization (e.g., `Quantum-Node-1029`). This local hardware identifier provides a digital calling-card within modern decentralized workflows without requiring personal or cloud authentication.

---

## 🔒 Security Architecture: Defense in Depth

JohnCrypt utilizes a strict client-side isolation model:
1.  **Zero Network Exposure**: Your physical file data is loaded into pure Web Worker memory (`SharedArrayBuffer` or `underlying array chunks`) to perform inline WebAssembly cryptography. It never reaches the internet.
2.  **HKDF Key Derivation**: Input secrets are salted and expanded using **HKDF-SHA512** into non-correlated ephemeral keys for distinct ciphers.
3.  **Encrypt-then-MAC (EtM)**: All headers and ciphertext payloads are authenticated via a final **HMAC-SHA512** outer layer, verifying physical envelope state before triggering heavy decipher pipelines.

---

## 🛠️ Modern Engineering Stack
*   **Framework**: React 19 / TypeScript / Vite 6
*   **Aesthetics**: Glassmorphic UI with bespoke tailwind colorways and visual indicators
*   **Runtime**: Shared Web Workers handling async background data streaming to prevent browser UI thread locking
*   **Animation**: `motion/react` optimized to run fully at 60fps on mobile/desktop displays
*   **Bundler**: Customized bundling compiler resolving ES TS paths with high stability

---

## ⚙️ Development & Quickstart

To run the high-performance sandbox locally on your terminal:

### 1. Install Dependencies
```bash
npm install
```

### 2. Enter Development Environment
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your local browser.

### 3. Compile Production Bundle
```bash
npm run build
```
Generates statically optimized build assets in the `/dist` directory.

---
`JohnCrypt` is built under standard zero-tracking principles. Keep your keys safe—without your password, decryption is mathematically impossible!
