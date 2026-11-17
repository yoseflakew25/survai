import { useRegisterActions } from 'kbar';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/components/themes/theme-provider';

const useThemeSwitching = () => {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('kbar');

  const toggleDarkLight = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const themeActions = [
    {
      id: 'toggleDarkLight',
      name: t('toggleTheme'),
      shortcut: ['d', 'd'],
      section: t('theme'),
      perform: toggleDarkLight
    },
    {
      id: 'setLightTheme',
      name: t('setLight'),
      section: t('theme'),
      perform: () => setTheme('light')
    },
    {
      id: 'setDarkTheme',
      name: t('setDark'),
      section: t('theme'),
      perform: () => setTheme('dark')
    }
  ];

  useRegisterActions(themeActions, [theme, t]);
};

export default useThemeSwitching;
