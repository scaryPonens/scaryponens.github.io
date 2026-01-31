// Manifest of blog posts
// The markdown-raw plugin handles resolving files with brackets

// Import blog posts - the plugin will resolve these at build time
import examplePost from '../thoughts/[2026.1.30] Example Post.md';

export const blogManifest = [
  {
    filename: '[2026.1.30] Example Post.md',
    content: examplePost
  }
];
