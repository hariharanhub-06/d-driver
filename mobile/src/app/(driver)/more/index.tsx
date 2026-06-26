import React from 'react';
import { Stack } from 'expo-router';
import { useT } from '@/lib/i18n';
import { HubList, type HubItem } from '@/components/Hub';

export default function DriverMoreHub() {
    const tr = useT();
    const items: HubItem[] = [
        { route: '/(driver)/more/maintenance', title: tr('Maintenance', 'பராமரிப்பு'), subtitle: tr('Report a vehicle issue', 'வாகன சிக்கலைப் புகாரளி'), icon: 'tool' },
        { route: '/(driver)/more/fuel', title: tr('Fuel', 'எரிபொருள்'), subtitle: tr('Request fuel', 'எரிபொருள் கோரிக்கை'), icon: 'droplet' },
        { route: '/(driver)/more/shift', title: tr('Shift Log', 'பணி நேரம்'), subtitle: tr('Start / end shift & history', 'ஷிப்ட் வரலாறு'), icon: 'clock' },
    ];
    return (
        <>
            <Stack.Screen options={{ title: tr('More', 'மேலும்') }} />
            <HubList heading={tr('More', 'மேலும்')} subheading={tr('Driver tools', 'ஓட்டுநர் கருவிகள்')} items={items} />
        </>
    );
}
