'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export interface SchoolPermissions {
  gps_tracking?: boolean;
  fee_management?: boolean;
  fuel_management?: boolean;
  shift_tracking?: boolean;
  attendance?: boolean;
  parent_portal?: boolean;
  route_management?: boolean;
  student_photos?: boolean;
  stop_change_requests?: boolean;
  absence_reporting?: boolean;
  razorpay_payments?: boolean;
}

interface SchoolBranding {
  slug: string;
  name: string;
  logo_url: string;
  primary_color: string;
  permissions: SchoolPermissions | null;
}

interface SchoolBrandingContextType {
  branding: SchoolBranding;
  setSchoolBranding: (data: Partial<SchoolBranding>) => void;
}

const defaultBranding: SchoolBranding = {
  slug: '',
  name: 'D-Driver',
  logo_url: '',
  primary_color: '#3B82F6',
  permissions: null,
};

const SchoolBrandingContext = createContext<SchoolBrandingContextType>({
  branding: defaultBranding,
  setSchoolBranding: () => {},
});

export function SchoolBrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<SchoolBranding>(defaultBranding);

  const setSchoolBranding = (data: Partial<SchoolBranding>) => {
    setBranding(prev => ({ ...prev, ...data }));
  };

  useEffect(() => {
    const slug = document.cookie
      .split('; ')
      .find(r => r.startsWith('school-slug='))
      ?.split('=')[1];

    if (!slug) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/schools/public/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data?.name) {
          setBranding(prev => ({
            ...prev,
            slug: data.slug || slug,
            name: data.name,
            logo_url: data.logo_url || '',
            primary_color: data.primary_color || '#3B82F6',
            permissions: data.permissions || null,
          }));
          document.documentElement.style.setProperty('--brand', data.primary_color || '#3B82F6');
        }
      })
      .catch(() => {});
  }, []);

  return (
    <SchoolBrandingContext.Provider value={{ branding, setSchoolBranding }}>
      {children}
    </SchoolBrandingContext.Provider>
  );
}

export const useSchoolBranding = () => useContext(SchoolBrandingContext).branding;
export const useSetSchoolBranding = () => useContext(SchoolBrandingContext).setSchoolBranding;
