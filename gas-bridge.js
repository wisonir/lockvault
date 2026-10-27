/**
 * Modern GAS Fetch Bridge
 * Menghindari kendala OPTIONS preflight CORS pada Google Apps Script
 */

class GasBridge {
    static async request(payload) {
        try {
            const response = await fetch(CONFIG.GAS_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Koneksi HTTP bermasalah: Status ${response.status}`);
            }

            const res = await response.json();
            if (!res.success) {
                throw new Error(res.error || "Gagal memproses data di server");
            }

            return res.data;
        } catch (err) {
            console.error("[Bridge Error]:", err);
            throw err;
        }
    }
}