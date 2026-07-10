import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Troia',
  tagline: 'The settlement layer that makes every lira accountable',
  favicon: 'img/favicon.ico',

  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Production url.
  url: 'https://troiadocs.vercel.app',
  baseUrl: '/',

  organizationName: 'tamerarda',
  projectName: 'troia',

  // 'warn' while the docs are being ported/cross-linked; tighten to 'throw' before the final deploy.
  onBrokenLinks: 'warn',

  // Code-heavy technical docs: parse .md as CommonMark (not MDX) so raw <…>/{…} in prose never break the build.
  markdown: {
    format: 'detect',
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // docs ARE the site — no separate landing page; the Overview is the root
          // no editUrl — this is a self-contained documentation site, not a repo-backed wiki
        },
        blog: false, // docs-only site
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Troia',
      items: [
        {
          type: 'html',
          position: 'right',
          value: '<span class="navbar__badge">Testnet PoC</span>',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Overview', to: '/'},
            {label: 'Architecture', to: '/architecture'},
            {label: 'Reconciliation', to: '/reconciliation'},
          ],
        },
        {
          title: 'Run it',
          items: [
            {label: 'Deployments', to: '/deployments'},
            {label: 'Live-smoke run', to: '/live-smoke'},
            {label: 'Demo script', to: '/demo-script'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Scope & limitations', to: '/scope'},
            {label: 'Toward mainnet', to: '/toward-mainnet'},
          ],
        },
      ],
      copyright: `Troia — a custodial TRY→USDC settlement bridge on Stellar. © 2026 tamerarda.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['rust', 'toml', 'bash', 'json', 'sql', 'diff'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
