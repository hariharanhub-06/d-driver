// Expo push registration. Fully guarded so a missing EAS projectId / denied
// permission / undeployed backend route never crashes the app.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerPushToken } from './api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export function usePushRegistration(enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        (async () => {
            try {
                if (!Device.isDevice) return;

                if (Platform.OS === 'android') {
                    // Channel sound is fixed at creation — versioned id lets a future
                    // tone change apply by creating a new channel. Default tone = bus horn.
                    await Notifications.setNotificationChannelAsync('alerts-horn-v1', {
                        name: 'Bus alerts',
                        importance: Notifications.AndroidImportance.HIGH,
                        sound: 'bus_horn.wav',
                    });
                }

                const existing = await Notifications.getPermissionsAsync();
                let status = existing.status;
                if (status !== 'granted') {
                    const req = await Notifications.requestPermissionsAsync();
                    status = req.status;
                }
                if (status !== 'granted' || cancelled) return;

                const projectId =
                    (Constants.expoConfig as any)?.extra?.eas?.projectId ||
                    (Constants as any)?.easConfig?.projectId;
                if (!projectId) return; // no EAS project yet — skip silently

                const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
                if (token && !cancelled) await registerPushToken(token);
            } catch {
                /* push is best-effort */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [enabled]);
}
