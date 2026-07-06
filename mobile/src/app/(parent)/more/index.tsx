import React from 'react';
import { Stack } from 'expo-router';
import { useT } from '@/lib/i18n';
import { HubList, type HubItem } from '@/components/Hub';

export default function ParentMoreHub() {
    const tr = useT();
    const items: HubItem[] = [
        { route: '/(parent)/more/fees', title: tr('Fees', 'கட்டணம்'), subtitle: tr('Dues & payments', 'நிலுவைகள்'), icon: 'dollar-sign' },
        { route: '/(parent)/more/attendance', title: tr('Attendance', 'வருகை'), subtitle: tr('Child attendance history', 'வருகை வரலாறு'), icon: 'check-square' },
        { route: '/(parent)/more/notifications', title: tr('Notifications', 'அறிவிப்புகள்'), subtitle: tr('Alerts & messages', 'அறிவிப்புகள்'), icon: 'bell' },
        { route: '/(parent)/more/nearby-stops', title: tr('Nearby Stops', 'அருகிலுள்ள நிறுத்தங்கள்'), subtitle: tr('Find stops near you', 'நிறுத்தங்களைக் கண்டறி'), icon: 'map-pin' },
        { route: '/(parent)/more/requests', title: tr('Requests', 'கோரிக்கைகள்'), subtitle: tr('Stop change, leave & more', 'கோரிக்கைகள்'), icon: 'send' },
        { route: '/(parent)/more/subscription', title: tr('My Subscription', 'எனது சந்தா'), subtitle: tr('Plan & features', 'திட்டம் & அம்சங்கள்'), icon: 'award' },
    ];
    return (
        <>
            <Stack.Screen options={{ title: tr('More', 'மேலும்') }} />
            <HubList heading={tr('More', 'மேலும்')} subheading={tr('Everything for your child', 'உங்கள் குழந்தைக்கான அனைத்தும்')} items={items} />
        </>
    );
}
