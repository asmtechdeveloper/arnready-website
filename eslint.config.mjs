import nextConfig from 'eslint-config-next';
import nextTypescriptConfig from 'eslint-config-next/typescript';

const eslintConfig = [
  { ignores: ['out/**', '.next/**', 'node_modules/**', 'content/**', '.leakcheck/**'] },
  ...nextConfig,
  ...nextTypescriptConfig,
];

export default eslintConfig;
