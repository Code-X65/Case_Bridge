/**
 * CaseBridge Cryptographic Vault
 * Implements AES-256-GCM for Client-Side Encryption
 */

export const cryptoVault = {
    /**
     * Generates a random AES-256 key
     */
    async generateKey(): Promise<CryptoKey> {
        return await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        );
    },

    /**
     * Exports a CryptoKey to a base64 string for storage
     */
    async exportKey(key: CryptoKey): Promise<string> {
        const exported = await window.crypto.subtle.exportKey("raw", key);
        return btoa(String.fromCharCode(...new Uint8Array(exported)));
    },

    /**
     * Imports a base64 string back into a CryptoKey
     */
    async importKey(base64Key: string): Promise<CryptoKey> {
        const binaryKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
        return await window.crypto.subtle.importKey(
            "raw",
            binaryKey,
            "AES-GCM",
            true,
            ["encrypt", "decrypt"]
        );
    },

    /**
     * Encrypts plaintext using AES-GCM
     * Returns base64(IV + Ciphertext)
     */
    async encrypt(plaintext: string, key: CryptoKey): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            data
        );

        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(ciphertext), iv.length);

        return btoa(String.fromCharCode(...combined));
    },

    /**
     * Decrypts base64(IV + Ciphertext)
     */
    async decrypt(combinedBase64: string, key: CryptoKey): Promise<string> {
        const combined = Uint8Array.from(atob(combinedBase64), c => c.charCodeAt(0));
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        try {
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                },
                key,
                ciphertext
            );

            return new TextDecoder().decode(decrypted);
        } catch (e) {
            console.error("Decryption failed:", e);
            return "[ENCRYPTED DATA - DECRYPTION ERROR]";
        }
    }
};
