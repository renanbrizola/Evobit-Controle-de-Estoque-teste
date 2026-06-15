import { createContext, useContext } from 'react';
import { translate } from './translations';

// Default value provides a working `t` (Portuguese) so components that read the
// language context render correctly even without a LanguageProvider above them
// (e.g. in isolated unit tests). The provider overrides this with live state.
export const LanguageContext = createContext({
    language: 'pt',
    setLanguage: () => {},
    t: (section, key) => translate('pt', section, key),
});

export const useLanguage = () => useContext(LanguageContext);
