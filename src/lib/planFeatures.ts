// Canonical feature-permission catalog shared by the super-admin plan editor and the
// admin/parent subscription pages. Keys mirror School.permissions / PricingPlan.permissions.
export interface PlanFeature {
    key: string;
    label: string;
    description: string;
}

export const PLAN_FEATURES: PlanFeature[] = [
    { key: 'gps_tracking', label: 'GPS Tracking', description: 'Live bus location for parents and admin' },
    { key: 'fee_management', label: 'Fee Management', description: 'Fee collection, invoices, and payments' },
    { key: 'fuel_management', label: 'Fuel Management', description: 'Fuel requests, fills, and cost tracking' },
    { key: 'shift_tracking', label: 'Shift & Kilometre Tracking', description: 'Driver shift logs and odometer entries' },
    { key: 'attendance', label: 'Attendance', description: 'Driver marks student boarding/drop' },
    { key: 'parent_portal', label: 'Parent Portal', description: 'Parent app with tracking and notifications' },
    { key: 'route_management', label: 'Route Management', description: 'Create and edit routes and stops' },
    { key: 'student_photos', label: 'Student Photos', description: 'Upload and display student profile photos' },
    { key: 'stop_change_requests', label: 'Stop Change Requests', description: 'Parents can request stop changes' },
    { key: 'absence_reporting', label: 'Absence Reporting', description: 'Parents pre-report student absence' },
    { key: 'razorpay_payments', label: 'Online Payments', description: 'Razorpay integration for fee payments' },
    { key: 'reports', label: 'Reports & Analytics', description: 'Exportable operational and revenue reports' },
    { key: 'bus_switch', label: 'Bus Switching', description: 'Reassign drivers/buses on the fly' },
    { key: 'bulk_import', label: 'Bulk Import', description: 'CSV import of students, routes and stops' },
];

// A plan with no permissions object set imposes no restriction — everything the school
// already has stays enabled. This helper reads a plan's permission for a key with that
// "unset = allowed" default, used to render "included / not included" lists.
export function planAllows(permissions: Record<string, boolean> | null | undefined, key: string): boolean {
    if (!permissions || typeof permissions !== 'object' || Object.keys(permissions).length === 0) return true;
    return permissions[key] !== false;
}
