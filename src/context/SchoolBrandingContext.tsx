'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface SchoolBranding {
  slug: string;
  name: string;
  logo_url: string;
  primary_color: string;
}

const defaultBranding: SchoolBranding = {
  slug: '',
  name: 'D-Driver',
  logo_url: '',
  primary_color: '#3B82F6',
};

const SchoolBrandingContext = createContext<SchoolBranding>(defaultBranding);

export function SchoolBrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<SchoolBranding>(defaultBranding);

  useEffect(() => {
    // Read slug from cookie set by Next.js middleware
    const slug = document.cookie
      .split('; ')
      .find(r => r.startsWith('school-slug='))
      ?.split('=')[1];

    if (!slug) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/schools/public/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data?.name) {
          setBranding({
            slug: data.slug || slug,
            name: data.name,
            logo_url: data.logo_url || '',
            primary_color: data.primary_color || '#3B82F6',
          });
          // Apply brand color as CSS variable
          document.documentElement.style.setProperty('--brand', data.primary_color || '#3B82F6');
        }
      })
      .catch(() => {});
  }, []);

  return (
    <SchoolBrandingContext.Provider value={branding}>
      {children}
    </SchoolBrandingContext.Provider>
  );
}

export const useSchoolBranding = () => useContext(SchoolBrandingContext);
