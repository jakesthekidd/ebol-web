/**
 * Copied from the design-system reference repo:
 * storybook2026/src/theme/transflo-theme.ts
 *
 * When that repo changes, pull latest there, re-copy this file, and align
 * package.json (primeng / @primeuix/themes / @primeng/themes) before npm install.
 */
import { definePreset } from '@primeuix/themes';
import Lara from '@primeuix/themes/lara';

const TransfloTheme = definePreset(Lara, {
  primitive: {
    blue: {
      50: '#E9F1F8',
      100: '#D3E3F1',
      200: '#A7C7E4',
      300: '#7CACD6',
      400: '#5090C9',
      500: '#2474BB',
      600: '#2068A8',
      700: '#1D5D96',
      800: '#164670',
      900: '#0E2E4B',
      950: '#091E32',
    },
    cyan: {
      50: '#F1FAFE',
      100: '#E3F5FD',
      200: '#C7EBFB',
      300: '#AAE1F8',
      400: '#8ED7F6',
      500: '#72CDF4',
      600: '#67B8DC',
      700: '#5BA4C3',
      800: '#447B92',
      900: '#2E5262',
      950: '#1A2E38',
    },
    green: {
      50: '#E5F9EA',
      100: '#CCF2D6',
      200: '#99E5AC',
      300: '#66D983',
      400: '#33CC59',
      500: '#00BF30',
      600: '#00AC2B',
      700: '#009926',
      800: '#00731D',
      900: '#004C13',
      950: '#002609',
    },
    red: {
      50: '#FBE9EA',
      100: '#F8D2D5',
      200: '#F0A5AB',
      300: '#E97980',
      400: '#E14C56',
      500: '#DA1F2C',
      600: '#C41C28',
      700: '#AE1923',
      800: '#83131A',
      900: '#570C12',
      950: '#2C060A',
    },
    orange: {
      50: '#FFF6E5',
      100: '#FFEDCC',
      200: '#FFDA99',
      300: '#FFC866',
      400: '#FFB533',
      500: '#FFA300',
      600: '#E59300',
      700: '#CC8200',
      800: '#996200',
      900: '#664100',
      950: '#331F00',
    },
    slate: {
      50: '#FBFCFC',
      100: '#F7F8F9',
      200: '#F3F5F7',
      300: '#EFF2F4',
      400: '#E2E6EB',
      500: '#C6CCD6',
      600: '#A9B3C2',
      700: '#8D9AAE',
      800: '#717B8B',
      900: '#5A626F',
      950: '#3D454F',
    },
  },

  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#FFFFFF',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
      },
    },
  },
});

export default TransfloTheme;
