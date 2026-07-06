import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Badge } from '@/components/ui';

export default function StudentPassport() {
    const t = useTheme();
    const tr = useT();

    const upcoming = [
        tr('Talent & achievement records', 'திறமை & சாதனை பதிவுகள்'),
        tr('Digital ID & QR verification', 'டிஜிட்டல் அடையாள அட்டை & QR'),
        tr('Milestones and certificates', 'மைல்கற்கள் & சான்றிதழ்கள்'),
    ];

    return (
        <Screen>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 24 }}>
                <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: t.color.brand, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="credit-card" size={44} color={t.color.brandText} />
                </View>

                <Badge label={tr('Premium · Coming soon', 'பிரீமியம் · விரைவில்')} tone="warning" />

                <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: 12 }}>
                    <AppText size="xl" weight="800">{tr('Student Passport', 'மாணவர் பாஸ்போர்ட்')}</AppText>
                    <AppText muted size="sm" style={{ textAlign: 'center' }}>
                        {tr(
                            'A living digital record of your child — talents, achievements and milestones, all in one place. Coming soon.',
                            'உங்கள் குழந்தையின் திறமைகள், சாதனைகள் மற்றும் மைல்கற்கள் ஒரே இடத்தில். விரைவில் வருகிறது.',
                        )}
                    </AppText>
                </View>

                <Card style={{ width: '100%', gap: 10 }}>
                    <AppText size="sm" weight="700" muted>{tr("WHAT'S COMING", 'வரவிருப்பவை')}</AppText>
                    {upcoming.map((line, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.color.brand }} />
                            <AppText size="sm" weight="600">{line}</AppText>
                        </View>
                    ))}
                </Card>
            </View>
        </Screen>
    );
}
