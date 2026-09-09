export function getDeviceFingerprint(): string {
    if (typeof window === "undefined") return "";

    const STORAGE_KEY = "aprendia_device_fp";

    try {
        let fp = localStorage.getItem(STORAGE_KEY);
        if (!fp) {
            // Generar una huella única combinando pantalla,userAgent y UUID
            const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
            const userAgent = navigator.userAgent || "";
            const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            fp = `fp_${btoa(`${screenInfo}_${userAgent}_${randomPart}`).substring(0, 32)}`;
            localStorage.setItem(STORAGE_KEY, fp);
            // También guardar en cookie persistente
            document.cookie = `${STORAGE_KEY}=${fp}; path=/; max-age=315360000`; // 10 años
        }
        return fp;
    } catch {
        return "fp_fallback_" + Math.random().toString(36).substring(2, 10);
    }
}
