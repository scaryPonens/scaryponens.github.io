/**
 * Parse a blog post filename to extract date and title
 * Format: "[2026.1.30] Some blog title.md"
 * Returns: { date: Date, title: string, filename: string } or null
 */
export function parseFilename(filename) {
  const match = filename.match(/\[(\d+)\.(\d+)\.(\d+)\]\s*(.+)\.md$/);
  if (match) {
    const [, year, month, day, title] = match;
    return {
      date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)),
      title: title.trim(),
      filename: filename
    };
  }
  return null;
}

/**
 * Format date as "YYYY.M.D"
 */
export function formatDate(date) {
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

/**
 * Create a URL-friendly slug from a blog post filename
 * Format: "[2026.1.30] Some blog title.md" -> "2026-1-30-some-blog-title"
 */
export function createSlug(filename) {
  const parsed = parseFilename(filename);
  if (!parsed) return null;
  
  const dateStr = `${parsed.date.getFullYear()}-${parsed.date.getMonth() + 1}-${parsed.date.getDate()}`;
  const titleSlug = parsed.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `${dateStr}-${titleSlug}`;
}

/**
 * Find a blog post by slug
 */
export function findPostBySlug(posts, slug) {
  return posts.find(post => createSlug(post.filename) === slug);
}

/**
 * Load and parse all blog posts from the thoughts directory
 * Returns array of { date, title, filename, content } sorted by date (newest first)
 */
// Import the manifest
import { blogManifest } from './blogManifest.js';

export function loadBlogPosts() {
  try {
    // Use the manifest file which has explicit imports
    // The markdown-raw plugin handles resolving files with brackets
    const blogModules = {};
    
    // Add manifest entries to blogModules
    for (const entry of blogManifest) {
      blogModules[`../thoughts/${entry.filename}`] = { default: entry.content };
    }
    
    // Also try glob as fallback for files without brackets
    try {
      const globModules = import.meta.glob('../thoughts/*.md', { 
        eager: true
      });
      // Merge glob results (they won't have brackets, so won't conflict)
      Object.assign(blogModules, globModules);
    } catch (e) {
      console.log('Glob import failed (non-critical):', e.message);
    }

    console.log('Blog modules found:', Object.keys(blogModules).length);
    console.log('Blog module paths:', Object.keys(blogModules));

    const posts = [];

    // Parse each file
    for (const [path, module] of Object.entries(blogModules)) {
      // Extract filename from path (e.g., "../thoughts/[2026.1.30] Title.md" -> "[2026.1.30] Title.md")
      const filename = path.split('/').pop();
      console.log(`Processing file: ${filename} from path: ${path}`);
      
      const parsed = parseFilename(filename);
      
      if (!parsed) {
        console.warn(`Could not parse filename: ${filename}`);
        continue;
      }
      
      // Access the raw content
      // With the markdown-raw plugin, the content should be in module.default as a string
      let content = null;
      
      // Debug: log the module structure
      console.log(`Module for ${filename}:`, {
        module,
        type: typeof module,
        isObject: typeof module === 'object',
        keys: module && typeof module === 'object' ? Object.keys(module) : [],
        hasDefault: module && typeof module === 'object' && 'default' in module,
        defaultType: module && typeof module === 'object' && module.default ? typeof module.default : 'N/A'
      });
      
      // Try different ways to access the content
      if (typeof module === 'string') {
        content = module;
        console.log(`Found content as direct string for ${filename}`);
      } else if (module && typeof module === 'object') {
        // The plugin exports as: export default "content"
        if ('default' in module) {
          if (typeof module.default === 'string') {
            content = module.default;
            console.log(`Found content in module.default (string) for ${filename}, length: ${content.length}`);
          } else {
            content = String(module.default);
            console.log(`Found content in module.default (converted) for ${filename}, length: ${content.length}`);
          }
        } else {
          // Try to find string content in the module
          const values = Object.values(module);
          const stringValue = values.find(v => typeof v === 'string');
          if (stringValue) {
            content = stringValue;
            console.log(`Found content as string value in module for ${filename}`);
          } else {
            console.warn(`No string content found in module for ${filename}`);
          }
        }
      } else {
        console.warn(`Unexpected module type for ${filename}: ${typeof module}`);
      }
      
      if (content && typeof content === 'string' && content.trim().length > 0) {
        posts.push({
          ...parsed,
          content: content
        });
        console.log(`Successfully added post: ${parsed.title}`);
      } else {
        console.warn(`Could not extract valid content from: ${filename}`, {
          content,
          contentType: typeof content,
          contentLength: content ? content.length : 0
        });
      }
    }

    console.log(`Loaded ${posts.length} blog posts total`);
    
    // Sort by date (newest first)
    posts.sort((a, b) => b.date - a.date);

    return posts;
  } catch (error) {
    console.error('Error loading blog posts:', error);
    console.error('Error stack:', error.stack);
    return [];
  }
}
