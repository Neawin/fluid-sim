import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'wgsl-as-string',
      transform(code, id) {
        if (id.endsWith('.wgsl')) {
          return {
            code: `export default ${JSON.stringify(code)};`,
            map: null
          };
        }
      }
    }
  ]
});