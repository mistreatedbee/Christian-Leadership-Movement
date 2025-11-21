import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const languages = [
  { code: 'en' as const, name: 'English' },
  { code: 'af' as const, name: 'Afrikaans' },
  { code: 'zu' as const, name: 'Zulu' },
  { code: 'xh' as const, name: 'Xhosa' },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">
          {languages.find(l => l.code === language)?.name || 'English'}
        </span>
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  language === lang.code
                    ? 'bg-gold/10 text-gold font-semibold'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

