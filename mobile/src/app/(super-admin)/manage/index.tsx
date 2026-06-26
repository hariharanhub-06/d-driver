import React from 'react';
import { Stack } from 'expo-router';
import { useT } from '@/lib/i18n';
import { HubList, type HubItem } from '@/components/Hub';

export default function SaManageHub() {
    const tr = useT();
    const items: HubItem[] = [
        { route: '/(super-admin)/manage/users', title: tr('Users', 'பயனர்கள்'), subtitle: tr('All platform users', 'அனைத்து பயனர்கள்'), icon: 'users' },
        { route: '/(super-admin)/manage/subscriptions', title: tr('Subscriptions', 'சந்தாக்கள்'), subtitle: tr('School plans', 'பள்ளி திட்டங்கள்'), icon: 'credit-card' },
        { route: '/(super-admin)/manage/billing', title: tr('Billing', 'பில்லிங்'), subtitle: tr('Invoices & payments', 'விலைப்பட்டியல்'), icon: 'file-text' },
        { route: '/(super-admin)/manage/revenue', title: tr('Revenue', 'வருவாய்'), subtitle: tr('Income analytics', 'வருமானம்'), icon: 'trending-up' },
        { route: '/(super-admin)/manage/expenses', title: tr('Expenses', 'செலவுகள்'), subtitle: tr('Platform expenses', 'தள செலவுகள்'), icon: 'trending-down' },
        { route: '/(super-admin)/manage/reports', title: tr('Reports', 'அறிக்கைகள்'), subtitle: tr('Platform reports', 'தள அறிக்கைகள்'), icon: 'bar-chart-2' },
        { route: '/(super-admin)/manage/activity', title: tr('Activity', 'செயல்பாடு'), subtitle: tr('Recent activity', 'சமீபத்திய செயல்பாடு'), icon: 'activity' },
        { route: '/(super-admin)/manage/audit', title: tr('Audit Log', 'தணிக்கை'), subtitle: tr('Audit trail', 'தணிக்கை பதிவு'), icon: 'shield' },
        { route: '/(super-admin)/manage/logs', title: tr('System Logs', 'பதிவுகள்'), subtitle: tr('Server logs', 'சர்வர் பதிவுகள்'), icon: 'list' },
        { route: '/(super-admin)/manage/permissions', title: tr('Permissions', 'அனுமதிகள்'), subtitle: tr('School feature access', 'அம்ச அணுகல்'), icon: 'lock' },
        { route: '/(super-admin)/manage/settings', title: tr('Platform Settings', 'தள அமைப்புகள்'), subtitle: tr('Branding & config', 'அமைப்பு'), icon: 'settings' },
        { route: '/(super-admin)/manage/tracking', title: tr('Live Tracking', 'நேரடி கண்காணிப்பு'), subtitle: tr('All buses live', 'அனைத்து பேருந்துகள்'), icon: 'map' },
    ];
    return (
        <>
            <Stack.Screen options={{ title: tr('Manage', 'நிர்வாகம்') }} />
            <HubList heading={tr('Platform Management', 'தள நிர்வாகம்')} subheading={tr('Control the whole platform', 'முழு தளத்தையும் நிர்வகி')} items={items} />
        </>
    );
}
