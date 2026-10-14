import tseslint from 'typescript-eslint';
export default tseslint.config(
 {ignores:['**/node_modules/**','**/.next/**','**/dist/**','**/out/**','**/cache/**','**/.run/**','**/.vercel/**','**/lib/forge-std/**','**/next-env.d.ts','**/src/examples/samples.ts']},
 ...tseslint.configs.recommended.map(config=>({...config,files:['packages/app/src/**/*.{ts,tsx}','packages/widget/src/**/*.{ts,tsx}','packages/sdk/src/**/*.{ts,tsx}']})),
 {files:['packages/app/src/**/*.{ts,tsx}','packages/widget/src/**/*.{ts,tsx}','packages/sdk/src/**/*.{ts,tsx}'],rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}],'no-empty':['error',{allowEmptyCatch:true}]}}
);
