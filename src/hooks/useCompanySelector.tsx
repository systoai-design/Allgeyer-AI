import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { Company, CompanyType } from '@/types/database';

interface CompanySelectorContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  availableCompanies: Company[];
  isLoading: boolean;
}

const CompanySelectorContext = createContext<CompanySelectorContextType | undefined>(undefined);

export function CompanySelectorProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const companies = auth?.companies ?? [];
  const authLoading = auth?.loading ?? true;
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Auto-select first company when companies load
  useEffect(() => {
    if (!authLoading && companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0]);
    }
  }, [companies, authLoading, selectedCompany]);

  return (
    <CompanySelectorContext.Provider value={{
      selectedCompany,
      setSelectedCompany,
      availableCompanies: companies,
      isLoading: authLoading
    }}>
      {children}
    </CompanySelectorContext.Provider>
  );
}

export function useCompanySelector() {
  const context = useContext(CompanySelectorContext);
  if (context === undefined) {
    throw new Error('useCompanySelector must be used within a CompanySelectorProvider');
  }
  return context;
}

// Helper to get company CSS class
export function getCompanyClass(companyType: CompanyType): string {
  const classMap: Record<CompanyType, string> = {
    property_halo: 'company-property-halo',
    unique_painting: 'company-unique-painting',
    ati_security: 'company-ati-security'
  };
  return classMap[companyType];
}

// Helper to get company display color
export function getCompanyColor(companyType: CompanyType): string {
  const colorMap: Record<CompanyType, string> = {
    property_halo: 'hsl(160 84% 39%)',
    unique_painting: 'hsl(217 91% 60%)',
    ati_security: 'hsl(0 72% 51%)'
  };
  return colorMap[companyType];
}
