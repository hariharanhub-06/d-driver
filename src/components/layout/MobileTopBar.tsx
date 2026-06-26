'use client';

import { Bus } from 'lucide-react';
import { useSchoolBranding } from '@/context/SchoolBrandingContext';
import ProfileMenu from './ProfileMenu';

// Slim top app-bar for the bottom-nav roles (driver / bus-staff / parent):
// brand on the left, profile+logout menu on the right.
export default function MobileTopBar() {
    const branding = useSchoolBranding();
    const name = branding?.name || 'Onlive';
    const logo = branding?.logo_url;
    return (
        <header
            className="shrink-0 h-14 flex items-center justify-between px-4 border-b"
            style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
        >
            <div className="flex items-center gap-2 min-w-0">
                {logo ? (
                    <img src={logo} alt={name} className="h-8 w-8 rounded-lg object-cover shrink-0" />
                ) : (
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center shrink-0">
                        <Bus className="w-4 h-4 text-white" />
                    </div>
                )}
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{name}</span>
            </div>
            <ProfileMenu />
        </header>
    );
}
