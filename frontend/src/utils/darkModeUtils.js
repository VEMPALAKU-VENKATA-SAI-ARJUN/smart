/**
 * Dark Mode Utility Functions
 * Use these to apply dark mode styles in React components
 */

export const getDarkModeClass = (darkMode, lightClass = '', darkClass = '') => {
  return darkMode ? darkClass : lightClass;
};

export const getDarkModeStyle = (darkMode, lightStyle = {}, darkStyle = {}) => {
  return darkMode ? { ...lightStyle, ...darkStyle } : lightStyle;
};

export const darkModeColors = {
  // Backgrounds
  bgPrimary: '#0f172a',
  bgSecondary: '#1e293b',
  bgTertiary: '#334155',
  
  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#e2e8f0',
  textTertiary: '#cbd5e1',
  textMuted: '#94a3b8',
  
  // Borders
  border: '#334155',
  borderLight: '#475569',
  
  // Accents
  purple: '#8b5cf6',
  purpleLight: '#a78bfa',
  purpleDark: '#7c3aed',
  
  // Status
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

export const lightModeColors = {
  // Backgrounds
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgTertiary: '#f1f5f9',
  
  // Text
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  textMuted: '#cbd5e1',
  
  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  
  // Accents
  purple: '#7c3aed',
  purpleLight: '#8b5cf6',
  purpleDark: '#6d28d9',
  
  // Status
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

export const getThemeColors = (darkMode) => {
  return darkMode ? darkModeColors : lightModeColors;
};

// Example usage in components:
// import { useTheme } from '../contexts/ThemeContext';
// import { getThemeColors } from '../utils/darkModeUtils';
//
// function MyComponent() {
//   const { darkMode } = useTheme();
//   const colors = getThemeColors(darkMode);
//   
//   return (
//     <div style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary }}>
//       Content
//     </div>
//   );
// }
