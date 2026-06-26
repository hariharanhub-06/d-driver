import { Redirect } from 'expo-router';

export default function BusStaffIndex() {
    return <Redirect href={'/(bus-staff)/attendance' as any} />;
}
