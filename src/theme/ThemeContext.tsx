import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';
import { useAuth } from '../context/AuthContext';

interface ThemeContextType {
  isDark: boolean;
  colors: typeof lightColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightColors,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const { profile } = useAuth();
  
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (profile?.preferences?.darkMode !== undefined) {
      setIsDark(profile.preferences.darkMode);
    } else {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [profile?.preferences?.darkMode, systemColorScheme]);

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
