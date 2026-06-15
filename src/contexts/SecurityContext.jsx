import { createContext, useContext } from 'react';

export const SecurityContext = createContext({});

export const useSecurity = () => useContext(SecurityContext);
