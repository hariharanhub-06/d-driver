import React from 'react';
import { Stack } from 'expo-router';
import { useT } from '@/lib/i18n';
import { HubList, type HubItem } from '@/components/Hub';

export default function AdminManageHub() {
    const tr = useT();
    const items: HubItem[] = [
        { route: '/(admin)/manage/buses', title: tr('Buses', 'பேருந்துகள்'), subtitle: tr('Fleet vehicles', 'வாகனங்கள்'), icon: 'truck' },
        { route: '/(admin)/manage/drivers', title: tr('Drivers', 'ஓட்டுநர்கள்'), subtitle: tr('Driver accounts & assignment', 'ஓட்டுநர் கணக்குகள்'), icon: 'user' },
        { route: '/(admin)/manage/bus-staff', title: tr('Bus Staff', 'பணியாளர்கள்'), subtitle: tr('Attendants', 'உதவியாளர்கள்'), icon: 'users' },
        { route: '/(admin)/manage/students', title: tr('Students', 'மாணவர்கள்'), subtitle: tr('Roster & stops', 'மாணவர் பட்டியல்'), icon: 'user-check' },
        { route: '/(admin)/manage/parents', title: tr('Parents', 'பெற்றோர்கள்'), subtitle: tr('Parent accounts', 'பெற்றோர் கணக்குகள்'), icon: 'users' },
        { route: '/(admin)/manage/routes', title: tr('Routes', 'வழித்தடங்கள்'), subtitle: tr('Bus routes', 'பேருந்து வழிகள்'), icon: 'git-branch' },
        { route: '/(admin)/manage/stops', title: tr('Stops', 'நிறுத்தங்கள்'), subtitle: tr('Pickup points', 'ஏற்றும் இடங்கள்'), icon: 'map-pin' },
        { route: '/(admin)/manage/attendance', title: tr('Attendance', 'வருகை'), subtitle: tr('Daily attendance', 'தினசரி வருகை'), icon: 'check-square' },
        { route: '/(admin)/manage/fees', title: tr('Fees', 'கட்டணம்'), subtitle: tr('Fee plans & payments', 'கட்டண திட்டங்கள்'), icon: 'dollar-sign' },
        { route: '/(admin)/manage/fuel-requests', title: tr('Fuel Requests', 'எரிபொருள்'), subtitle: tr('Approve fuel', 'எரிபொருள் ஒப்புதல்'), icon: 'droplet' },
        { route: '/(admin)/manage/maintenance', title: tr('Maintenance', 'பராமரிப்பு'), subtitle: tr('Service logs', 'சேவை பதிவுகள்'), icon: 'tool' },
        { route: '/(admin)/manage/stop-change-requests', title: tr('Stop Changes', 'நிறுத்த மாற்றம்'), subtitle: tr('Parent requests', 'பெற்றோர் கோரிக்கைகள்'), icon: 'shuffle' },
        { route: '/(admin)/manage/bus-switches', title: tr('Bus Switches', 'பேருந்து மாற்றம்'), subtitle: tr('Reassignments', 'மறு ஒதுக்கீடு'), icon: 'repeat' },
        { route: '/(admin)/manage/leave-requests', title: tr('Leave Requests', 'விடுப்பு'), subtitle: tr('Staff leave', 'பணியாளர் விடுப்பு'), icon: 'calendar' },
        { route: '/(admin)/manage/shift-logs', title: tr('Shift Logs', 'பணி நேரம்'), subtitle: tr('Driver shifts', 'ஓட்டுநர் ஷிப்ட்'), icon: 'clock' },
        { route: '/(admin)/manage/reports', title: tr('Reports', 'அறிக்கைகள்'), subtitle: tr('Analytics', 'பகுப்பாய்வு'), icon: 'bar-chart-2' },
        { route: '/(admin)/manage/notifications', title: tr('Notifications', 'அறிவிப்புகள்'), subtitle: tr('Send & history', 'அனுப்பு'), icon: 'bell' },
        { route: '/(admin)/manage/settings', title: tr('Settings', 'அமைப்புகள்'), subtitle: tr('School settings', 'பள்ளி அமைப்புகள்'), icon: 'settings' },
    ];
    return (
        <>
            <Stack.Screen options={{ title: tr('Manage', 'நிர்வாகம்') }} />
            <HubList heading={tr('Manage', 'நிர்வாகம்')} subheading={tr('Everything for your school', 'உங்கள் பள்ளிக்கான அனைத்தும்')} items={items} />
        </>
    );
}
