/* ============================================================
 * Configuracion de ESLint - CalzaTodo
 * Laboratorio 4 | Fundacion Kinal
 * ------------------------------------------------------------
 * Formato "flat config" (eslint.config.js), que es el que usa
 * ESLint 9 y 10. El archivo usa ESM porque package.json declara
 * "type": "module".
 *
 * Los bloques se aplican en orden y el ultimo que coincide gana:
 *   1. ignores  -> carpetas que nunca se revisan.
 *   2. general  -> todo .js, con el juego recomendado de reglas.
 *   3. navegador-> script.js usa APIs del navegador y es un script clasico.
 *   4. reglas   -> reglas de calidad exigidas en el laboratorio.
 * ============================================================ */

import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    // node_modules y la carpeta interna que genera Husky no se revisan.
    ignores: ['node_modules/**', '.husky/_/**'],
  },
  {
    // Base: se aplican a cualquier archivo .js del proyecto.
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // El codigo de la aplicacion corre en el navegador.
    // sourceType "script" porque index.html lo carga sin type="module",
    // asi el sitio tambien funciona abriendo el archivo con doble clic.
    files: ['script.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // Reglas de calidad: son las que vigila el hook de Husky.
    rules: {
      // Detecta variables, funciones o parametros que nunca se usan.
      'no-unused-vars': 'error',
      // Detecta nombres que no estan declarados.
      'no-undef': 'error',
      // Prohige comparar con "==" cuando lo correcto es "===".
      eqeqeq: ['error', 'always'],
      // Obliga a declarar con const o let, nunca con var.
      'prefer-const': 'error',
      'no-var': 'error',
      // Exige llaves en las Sentencias if/else.
      curly: ['error', 'multi-line'],
      // Impide usar console.* en el codigo de la app.
      'no-console': 'error',
    },
  },
];
