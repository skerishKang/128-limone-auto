module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // 필요시 ESLint rules 추가
    'react/no-unescaped-entities': 'off',
    '@next/next/no-page-custom-font': 'off',
  },
};
