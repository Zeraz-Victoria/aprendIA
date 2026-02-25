import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// We use dummy fallbacks so the app doesn't crash if the user hasn't configured Pusher yet.
export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID || 'dummy_id',
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key',
    secret: process.env.PUSHER_SECRET || 'dummy_secret',
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    useTLS: true,
});

export const getPusherClient = () => {
    return new PusherClient(
        process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key',
        {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
        }
    );
};
