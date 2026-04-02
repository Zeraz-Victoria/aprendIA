"use client";

import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

/**
 * Hook that periodically validates the session token against the database.
 * If another device logs in with the same user, this device gets kicked out.
 */
export function useSessionGuard() {
    const { data: session } = useSession();
    const hasShownAlert = useRef(false);

    useEffect(() => {
        const userId = (session?.user as any)?.id;
        const sessionToken = (session?.user as any)?.sessionToken;

        if (!userId || !sessionToken) return;

        const validateSession = async () => {
            try {
                const res = await fetch("/api/auth/validate-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, sessionToken })
                });
                if (!res.ok) {
                    console.warn(`Session validation HTTP error: ${res.status}`);
                    return;
                }

                const data = await res.json();

                if (!data.valid && !hasShownAlert.current && data.reason === "token_mismatch") {
                    hasShownAlert.current = true;
                    alert("⚠️ Tu sesión se cerró porque alguien inició sesión con tu cuenta en otro dispositivo.");
                    signOut({ callbackUrl: "/" });
                } else if (!data.valid && !hasShownAlert.current) {
                    // Just an expired or invalid session (e.g., from server restart). 
                    // Sign out silently without the scary alert.
                    hasShownAlert.current = true;
                    signOut({ callbackUrl: "/" });
                }
            } catch (e) {
                // Network error — don't kick them out, just skip
                console.error("Session validation failed:", e);
            }
        };

        // Check immediately and then every 30 seconds to maintain "Online" status
        validateSession();
        const interval = setInterval(validateSession, 30000);
        return () => clearInterval(interval);
    }, [session]);
}
