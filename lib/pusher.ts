import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Lazy initialization — no crashea si faltan variables de entorno al arrancar
let pusherServerInstance: PusherServer | null = null;

export const getPusherServer = (): PusherServer => {
    if (!pusherServerInstance) {
        if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_SECRET || !process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
            throw new Error('Faltan variables de entorno de Pusher: PUSHER_APP_ID, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER');
        }
        pusherServerInstance = new PusherServer({
            appId: process.env.PUSHER_APP_ID,
            key: process.env.NEXT_PUBLIC_PUSHER_KEY,
            secret: process.env.PUSHER_SECRET,
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
            useTLS: true,
        });
    }
    return pusherServerInstance;
};

// Alias para compatibilidad con código existente
export const pusherServer = new Proxy({} as PusherServer, {
    get(_target, prop) {
        return (getPusherServer() as any)[prop];
    }
});

// Singleton para el cliente para no crear múltiples conexiones innecesarias
let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = (): PusherClient | null => {
    if (!pusherClientInstance) {
        if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
            console.warn('⚠️ Pusher desactivado: faltan NEXT_PUBLIC_PUSHER_KEY o NEXT_PUBLIC_PUSHER_CLUSTER');
            return null;
        }
        pusherClientInstance = new PusherClient(
            process.env.NEXT_PUBLIC_PUSHER_KEY,
            {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
            }
        );
    }
    return pusherClientInstance;
};

