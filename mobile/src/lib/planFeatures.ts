// Feature-permission catalog mirroring the web (keys match School/PricingPlan permissions).
export interface PlanFeature { key: string; label: string }

export const PLAN_FEATURES: PlanFeature[] = [
    { key: 'gps_tracking', label: 'GPS Tracking' },
    { key: 'fee_management', label: 'Fee Management' },
    { key: 'fuel_management', label: 'Fuel Management' },
    { key: 'shift_tracking', label: 'Shift & Kilometre Tracking' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'parent_portal', label: 'Parent Portal' },
    { key: 'route_management', label: 'Route Management' },
    { key: 'student_photos', label: 'Student Photos' },
    { key: 'stop_change_requests', label: 'Stop Change Requests' },
    { key: 'absence_reporting', label: 'Absence Reporting' },
    { key: 'razorpay_payments', label: 'Online Payments' },
    { key: 'reports', label: 'Reports & Analytics' },
    { key: 'bus_switch', label: 'Bus Switching' },
    { key: 'bulk_import', label: 'Bulk Import' },
];

// Unset / empty permissions object = no restriction (everything included).
export function planAllows(permissions: Record<string, boolean> | null | undefined, key: string): boolean {
    if (!permissions || typeof permissions !== 'object' || Object.keys(permissions).length === 0) return true;
    return permissions[key] !== false;
}
