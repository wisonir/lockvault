/**
 * Client-Side Zero-Knowledge Cryptographic Engine
 * Standard: PBKDF2 (SHA-256) + AES-GCM 256-bit
 */

class CryptoEngine {
    static strToBuf(str) {
        return new TextEncoder().encode(str);
    }

    static bufToStr(buf) {
        return new TextDecoder().decode(buf);
    }

    static bufToB64(buf) {
        let binary = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    static b64ToBuf(b64) {
        const binary = window.atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * 1. Menghasilkan Master Key (256-bit AES Key) di memori RAM via PBKDF2
     */
    static async deriveMasterKey(password, email) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            "PBKDF2",
            false,
            ["deriveBits", "deriveKey"]
        );

        const salt = enc.encode(email.toLowerCase().trim());

        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: CONFIG.CRYPTO.ITERATIONS,
                hash: CONFIG.CRYPTO.HASH_NAME
            },
            keyMaterial,
            { name: CONFIG.CRYPTO.ALGO_NAME, length: CONFIG.CRYPTO.KEY_LENGTH },
            true,
            ["encrypt", "decrypt"]
        );
    }

    /**
     * 2. Menghasilkan Auth Hash untuk otentikasi ke Backend (Zero-Knowledge)
     */
    static async generateAuthHash(masterKey, password) {
        const rawKey = await crypto.subtle.exportKey("raw", masterKey);
        const combined = new Uint8Array(rawKey.byteLength + password.length);
        combined.set(new Uint8Array(rawKey), 0);
        combined.set(new TextEncoder().encode(password), rawKey.byteLength);

        const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
        return this.bufToB64(hashBuffer);
    }

    /**
     * 3. Enkripsi Payload Objek menggunakan AES-GCM dengan random IV 12-byte
     */
    static async encryptData(key, plainData) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = this.strToBuf(JSON.stringify(plainData));

        const cipherBuffer = await crypto.subtle.encrypt(
            { name: CONFIG.CRYPTO.ALGO_NAME, iv: iv },
            key,
            encoded
        );

        return {
            ciphertext: this.bufToB64(cipherBuffer),
            iv: this.bufToB64(iv)
        };
    }

    /**
     * 4. Dekripsi Ciphertext kembali ke objek JSON mentah
     */
    static async decryptData(key, ciphertextB64, ivB64) {
        try {
            const ciphertext = this.b64ToBuf(ciphertextB64);
            const iv = this.b64ToBuf(ivB64);

            const decrypted = await crypto.subtle.decrypt(
                { name: CONFIG.CRYPTO.ALGO_NAME, iv: new Uint8Array(iv) },
                key,
                ciphertext
            );

            return JSON.parse(this.bufToStr(decrypted));
        } catch (e) {
            console.error("Gagal mendekripsi item payload:", e);
            return null;
        }
    }

    /**
     * 5. Password Generator Kriptografis
     */
    static generateRandomPassword(length = 20, useUpper = true, useLower = true, useNums = true, useSymbols = true) {
        let charset = "";
        if (useUpper) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (useLower) charset += "abcdefghijklmnopqrstuvwxyz";
        if (useNums) charset += "0123456789";
        if (useSymbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";

        if (!charset) charset = "abcdefghijklmnopqrstuvwxyz0123456789";

        const values = new Uint32Array(length);
        crypto.getRandomValues(values);
        let result = "";
        for (let i = 0; i < length; i++) {
            result += charset[values[i] % charset.length];
        }
        return result;
    }

    /**
     * 6. Perhitungan Entropi Sandi (Bit Entropy)
     */
    static calculateEntropy(password) {
        if (!password) return 0;
        let pool = 0;
        if (/[a-z]/.test(password)) pool += 26;
        if (/[A-Z]/.test(password)) pool += 26;
        if (/[0-9]/.test(password)) pool += 10;
        if (/[^a-zA-Z0-9]/.test(password)) pool += 32;
        if (pool === 0) return 0;
        return Math.round(password.length * (Math.log(pool) / Math.log(2)));
    }
}