// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn', // Recomendado para evitar promessas não tratadas
      '@typescript-eslint/no-unsafe-argument': 'off', // Recomendado para evitar passar valores de tipo 'any' para funções
      '@typescript-eslint/no-unsafe-assignment': 'off', // Recomendado para evitar atribuir valores de tipo 'any' a variáveis
      '@typescript-eslint/no-unsafe-call': 'off', // Recomendado para evitar chamar funções de tipo 'any'
      '@typescript-eslint/no-unsafe-member-access': 'off', // Recomendado para evitar acessar propriedades de tipo 'any'
      '@typescript-eslint/no-unsafe-return': 'off', // Recomendado para evitar retornar valores de tipo 'any' de funções
      '@typescript-eslint/restrict-template-expressions': 'warn', // Recomendado para evitar usar expressões de tipo 'any' em templates literais
      '@typescript-eslint/require-await': 'warn', // Recomendado para evitar funções async sem await, o que pode indicar código assíncrono desnecessário
      '@typescript-eslint/unbound-method': 'warn', // Recomendado para evitar usar métodos de classe sem vincular o contexto, o que pode levar a erros de 'this' indefinido
      'no-console': 'warn', // Recomendado para evitar deixar console.log no código de produção
      'prettier/prettier': 'warn', // Recomendado para garantir que o código siga as regras de formatação do Prettier
      '@typescript-eslint/no-unused-vars': [
        'off',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'off',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/consistent-type-assertions': 'warn',
    },
  },
);
