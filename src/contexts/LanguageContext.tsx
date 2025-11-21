import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'en' | 'af' | 'zu' | 'xh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.courses': 'Courses',
    'nav.events': 'Events',
    'nav.donate': 'Donate',
    'nav.login': 'Login',
    'nav.dashboard': 'Dashboard',
    'nav.logout': 'Logout',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.name': 'Name',
    'common.email': 'Email',
    'common.phone': 'Phone',
    'common.address': 'Address',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
  },
  af: {
    'nav.home': 'Tuis',
    'nav.about': 'Oor',
    'nav.courses': 'Kursusse',
    'nav.events': 'Gebeurtenisse',
    'nav.donate': 'Skenk',
    'nav.login': 'Teken In',
    'nav.dashboard': 'Dashboard',
    'nav.logout': 'Teken Uit',
    'common.loading': 'Laai...',
    'common.error': 'Fout',
    'common.save': 'Stoor',
    'common.cancel': 'Kanselleer',
    'common.delete': 'Verwyder',
    'common.edit': 'Wysig',
    'common.create': 'Skep',
    'common.search': 'Soek',
    'common.filter': 'Filter',
    'common.actions': 'Aksies',
    'common.status': 'Status',
    'common.date': 'Datum',
    'common.name': 'Naam',
    'common.email': 'E-pos',
    'common.phone': 'Telefoon',
    'common.address': 'Adres',
    'common.submit': 'Dien In',
    'common.back': 'Terug',
    'common.next': 'Volgende',
    'common.previous': 'Vorige',
    'common.close': 'Sluit',
    'common.confirm': 'Bevestig',
    'common.yes': 'Ja',
    'common.no': 'Nee',
  },
  zu: {
    'nav.home': 'Ikhaya',
    'nav.about': 'Mayelana',
    'nav.courses': 'Izifundo',
    'nav.events': 'Imicimbi',
    'nav.donate': 'Nika',
    'nav.login': 'Ngena',
    'nav.dashboard': 'Ideshibhodi',
    'nav.logout': 'Phuma',
    'common.loading': 'Iyalayisha...',
    'common.error': 'Iphutha',
    'common.save': 'Gcina',
    'common.cancel': 'Khansela',
    'common.delete': 'Susa',
    'common.edit': 'Hlela',
    'common.create': 'Dala',
    'common.search': 'Sesha',
    'common.filter': 'Hlunga',
    'common.actions': 'Izenzo',
    'common.status': 'Isimo',
    'common.date': 'Usuku',
    'common.name': 'Igama',
    'common.email': 'I-imeyili',
    'common.phone': 'Ucingo',
    'common.address': 'Ikheli',
    'common.submit': 'Thumela',
    'common.back': 'Emuva',
    'common.next': 'Okulandelayo',
    'common.previous': 'Okwedlule',
    'common.close': 'Vala',
    'common.confirm': 'Qinisekisa',
    'common.yes': 'Yebo',
    'common.no': 'Cha',
  },
  xh: {
    'nav.home': 'Indlu',
    'nav.about': 'Malunga',
    'nav.courses': 'Izifundo',
    'nav.events': 'Iimeko',
    'nav.donate': 'Nika',
    'nav.login': 'Ngena',
    'nav.dashboard': 'Ideshibhodi',
    'nav.logout': 'Phuma',
    'common.loading': 'Iyalayisha...',
    'common.error': 'Impazamo',
    'common.save': 'Gcina',
    'common.cancel': 'Rhoxisa',
    'common.delete': 'Cima',
    'common.edit': 'Hlela',
    'common.create': 'Yenza',
    'common.search': 'Khangela',
    'common.filter': 'Coca',
    'common.actions': 'Izenzo',
    'common.status': 'Imeko',
    'common.date': 'Umhla',
    'common.name': 'Igama',
    'common.email': 'I-imeyili',
    'common.phone': 'Umnxeba',
    'common.address': 'Idilesi',
    'common.submit': 'Thumela',
    'common.back': 'Emva',
    'common.next': 'Okulandelayo',
    'common.previous': 'Okwangaphambili',
    'common.close': 'Vala',
    'common.confirm': 'Qinisekisa',
    'common.yes': 'Ewe',
    'common.no': 'Hayi',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

