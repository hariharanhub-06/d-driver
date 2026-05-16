'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface TourContextType {
  startTour: (tourName: string) => void;
  tourName: string | null;
}

const TourContext = createContext<TourContextType>({ startTour: () => {}, tourName: null });

export const TourProvider = ({ children }: { children: React.ReactNode }) => {
  const [tourName, setTourName] = useState<string | null>(null);
  const startTour = useCallback((name: string) => setTourName(name), []);
  return (
    <TourContext.Provider value={{ startTour, tourName }}>
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => useContext(TourContext);
