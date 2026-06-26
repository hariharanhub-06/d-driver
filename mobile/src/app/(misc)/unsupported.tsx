import React from 'react';
import { Linking } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Button, EmptyState } from '@/components/ui';
import { WEB_CONSOLE_URL } from '@/lib/config';

// Shown to roles not yet supported in the mobile app v1 (admin/driver/bus-staff)
// and to the master/dev super-admin (web console only).
export default function Unsupported() {
    const { user, logout } = useAuth();
    const t = useTheme();
    const tr = useT();
    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.is_dev_sa;

    return (
        <Screen>
            <EmptyState
                title={tr('Use the Onlive web console', 'Onlive வலை பயன்பாட்டைப் பயன்படுத்தவும்')}
                description={
                    isAdmin
                        ? tr(
                              'Administrator tools are available on the web. The mobile app is for parents.',
                              'நிர்வாக கருவிகள் வலையில் கிடைக்கும். மொபைல் செயலி பெற்றோருக்கானது.',
                          )
                        : tr(
                              'Your role will be available in the app soon. For now, please use the Onlive web app.',
                              'உங்கள் பங்கு விரைவில் செயலியில் கிடைக்கும். தற்போது வலை பயன்பாட்டைப் பயன்படுத்தவும்.',
                          )
                }
                action={
                    <>
                        <Button
                            title={tr('Open web app', 'வலை செயலியைத் திற')}
                            onPress={() => Linking.openURL(WEB_CONSOLE_URL)}
                            style={{ marginTop: t.spacing.md, minWidth: 220 }}
                        />
                        <Button title={tr('Log out', 'வெளியேறு')} variant="ghost" onPress={logout} style={{ minWidth: 220 }} />
                    </>
                }
            />
        </Screen>
    );
}
