import { createContext, useContext } from 'react';

export const ModuleContext = createContext({});

export const useModules = () => useContext(ModuleContext);
