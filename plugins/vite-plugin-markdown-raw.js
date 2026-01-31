import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Vite plugin to handle markdown files as raw text and resolve files with brackets
export default function markdownRaw() {
  return {
    name: 'markdown-raw',
    enforce: 'pre', // Run before other plugins
    resolveId(id, importer) {
      // Handle imports of markdown files with brackets
      if (id.includes('thoughts') && id.endsWith('.md') && id.includes('[')) {
        // Resolve the actual file path
        // __dirname is now plugins/, so go up one level to get project root
        const projectRoot = resolve(__dirname, '..');
        const thoughtsPath = resolve(projectRoot, 'thoughts');
        const filename = id.split('/').pop();
        const filePath = resolve(thoughtsPath, filename);
        
        // Return a virtual module ID that we can handle in load()
        return `\0markdown-raw:${filePath}`;
      }
      return null;
    },
    load(id) {
      // Handle our virtual module IDs
      if (id.startsWith('\0markdown-raw:')) {
        const filePath = id.replace('\0markdown-raw:', '');
        try {
          const content = readFileSync(filePath, 'utf-8');
          return `export default ${JSON.stringify(content)};`;
        } catch (e) {
          console.error(`Failed to read ${filePath}:`, e);
          return `export default "";`;
        }
      }
      return null;
    },
    transform(code, id) {
      // Check if this is a markdown file (for direct imports)
      if (id.endsWith('.md') && !id.includes('node_modules') && !id.startsWith('\0')) {
        // Return the markdown content as a raw string export
        const transformed = {
          code: `export default ${JSON.stringify(code)};`,
          map: null
        };
        console.log(`[markdown-raw] Transformed: ${id}`);
        return transformed;
      }
      // Return undefined to indicate no transformation
      return undefined;
    }
  };
}
