/**
 * LockVault Configuration
 */
const CONFIG = {
    // Ganti string di bawah ini dengan Web App URL hasil deployment Google Apps Script Anda
    GAS_API_URL: "https://script.google.com/macros/s/AKfycbyIyfAwOqrTxTTyBKHjm3J7kAq8FNhfh7nR5BCk3qAWv4q8BvbJ5-agvCcKl6xTIhd8Tg/exec",
    CRYPTO: {
        ITERATIONS: 100000,
        ALGO_NAME: "AES-GCM",
        HASH_NAME: "SHA-256",
        KEY_LENGTH: 256
    }
};