// mobile-app/theme.js
import { useColorScheme } from 'react-native';

/**
 * Hook that returns a ready-to-use palette based on the device theme.
 * Usage: const C = useThemeColors();
 */
export function useThemeColors() {
  const scheme = useColorScheme(); // 'light' | 'dark' | null

  const Light = {
    bg:    '#f8fafd',
    card:  '#ffffff',
    text:  '#222',
    textSoft: '#666',
    primary: '#467fd0',
    border: '#ccc'
  };

  const Dark = {
    bg:    '#101214',
    card:  '#1e1f22',
    text:  '#f5f7fa',
    textSoft: '#9aa0a6',
    primary: '#5b8fff',
    border: '#2f3336'
  };

  return scheme === 'dark' ? Dark : Light;
}
