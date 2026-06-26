import React from 'react';
import { Stack } from 'expo-router';
import { useT } from '@/lib/i18n';
import { HubList, type HubItem } from '@/components/Hub';

export default function BusStaffMoreHub() {
    const tr = useT();
    const items: HubItem[] = [
        { route: '/(bus-staff)/more/today', title: tr('Live Trip', 'நேரடி பயணம்'), subtitle: tr('Active trip overview', 'செயலில் உள்ள பயணம்'), icon: 'navigation' },
        { route: '/(bus-staff)/more/students', title: tr('Students', 'மாணவர்கள்'), subtitle: tr('Bus roster', 'பேருந்து பட்டியல்'), icon: 'user-check' },
    ];
    return (
        <>
            <Stack.Screen options={{ title: tr('More', 'மேலும்') }} />
            <HubList heading={tr('More', 'மேலும்')} subheading={tr('Staff tools', 'பணியாளர் கருவிகள்')} items={items} />
        </>
    );
}
