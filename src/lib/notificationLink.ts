// Best-effort deep link for a notification. The Notification model has no target_id/
// link field, so we infer the destination from the message text + the viewer's role.
// Returns a route to navigate to, or null (just mark read, don't navigate).
//
// Only links to routes that are known to exist for each role — never invents a path,
// so it can't create a fresh 404.

export function notificationHref(message: string | undefined, role: string | undefined): string | null {
    const m = (message || '').toLowerCase();

    if (role === 'parent') {
        if (m.includes('stop change') || m.includes('stop-change') || m.includes('change to') || m.includes('change request')) return '/parent/requests';
        if (m.includes('fee') || m.includes('payment') || m.includes('due') || m.includes('paid')) return '/parent/fees';
        return null; // info/attendance alerts stay on the notifications list
    }

    if (role === 'admin') {
        if (m.includes('stop change') || m.includes('stop-change')) return '/admin/stop-change-requests';
        if (m.includes('fuel')) return '/admin/fuel-requests';
        if (m.includes('maintenance')) return '/admin/maintenance';
        if (m.includes('fee') || m.includes('payment') || m.includes('due')) return '/admin/fees';
        if (m.includes('absent') || m.includes('absence') || m.includes('leave')) return '/admin/leave-requests';
        if (m.includes('bus switch') || m.includes('bus-switch')) return '/admin/bus-switches';
        if (m.includes('registered') || m.includes('enrolled') || m.includes('new student')) return '/admin/students';
        return null;
    }

    if (role === 'driver') {
        if (m.includes('maintenance')) return '/driver/maintenance';
        if (m.includes('attendance') || m.includes('absent')) return '/driver/attendance';
        return null;
    }

    // super_admin / bus_staff: no per-item destinations — stay on the list.
    return null;
}
