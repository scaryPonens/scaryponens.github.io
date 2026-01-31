import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const distDir = resolve(projectRoot, 'dist');
const blogDir = resolve(distDir, 'blog');
const thoughtsDir = resolve(projectRoot, 'thoughts');

// Parse filename to extract date and title
function parseFilename(filename) {
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

// Format date as "YYYY.M.D"
function formatDate(date) {
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

// Create slug from filename
function createSlug(filename) {
  const parsed = parseFilename(filename);
  if (!parsed) return null;
  
  const dateStr = `${parsed.date.getFullYear()}-${parsed.date.getMonth() + 1}-${parsed.date.getDate()}`;
  const titleSlug = parsed.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `${dateStr}-${titleSlug}`;
}

// Read the main index.html as a template
const indexHtml = readFileSync(resolve(distDir, 'index.html'), 'utf-8');

// Extract the script and CSS references from the main index.html
// Match script tag - look for src attribute
const scriptMatch = indexHtml.match(/<script[^>]*\ssrc="([^"]+)"[^>]*>/);
// Match CSS files in assets directory - look for href attribute
const cssMatches = [...indexHtml.matchAll(/<link[^>]*\shref="([^"]*\/assets\/[^"]+\.css)"[^>]*>/g)];

console.log('Script found:', scriptMatch ? scriptMatch[1] : 'none');
console.log('CSS files found:', cssMatches.length);

function generateBlogPostHTML(post, slug) {
  // Create a minimal HTML page with the blog post content embedded
  // We'll use a data attribute to pass the post data to React
  const postData = JSON.stringify({
    slug,
    date: formatDate(post.date),
    title: post.title,
    content: post.content,
    filename: post.filename
  }).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  // Calculate relative paths from blog/ directory to assets
  const scriptSrc = scriptMatch ? scriptMatch[1] : '';
  // Remove leading slash if present and add ../ prefix
  const scriptPath = scriptSrc.startsWith('/') 
    ? `../${scriptSrc.substring(1)}` 
    : `../${scriptSrc}`;
  
  const cssPaths = cssMatches.map(match => {
    const href = match[1];
    // Remove leading slash if present and add ../ prefix
    const relativePath = href.startsWith('/') 
      ? `../${href.substring(1)}` 
      : `../${href}`;
    return `    <link rel="stylesheet" crossorigin href="${relativePath}">`;
  }).join('\n');
  
  const scriptTag = scriptSrc 
    ? `    <script type="module" crossorigin src="${scriptPath}"></script>`
    : '';

  // Store post data in a script tag that runs before React loads
  // This ensures the data is available even if React replaces the root element
  const blogData = {
    slug,
    date: formatDate(post.date),
    title: post.title,
    content: post.content,
    filename: post.filename
  };
  
  // Use a non-module script that executes immediately and synchronously
  const inlineScript = `<script>
    window.__BLOG_POST_DATA__ = ${JSON.stringify(blogData)};
    console.log('[Blog Script] Data set:', window.__BLOG_POST_DATA__.title);
  </script>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${post.title} - scaryponens</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
${cssPaths || ''}
  </head>
  <body>
    <div id="root" data-blog-post='${postData}'></div>
${inlineScript}
${scriptTag}
  </body>
</html>`;
}

async function generateBlogPages() {
  try {
    console.log('Generating static blog pages...');
    
    // Read all markdown files from thoughts directory
    const files = readdirSync(thoughtsDir).filter(f => f.endsWith('.md'));
    console.log(`Found ${files.length} markdown files`);
    
    const posts = [];
    for (const file of files) {
      const parsed = parseFilename(file);
      if (parsed) {
        const content = readFileSync(resolve(thoughtsDir, file), 'utf-8');
        posts.push({
          ...parsed,
          content: content
        });
      }
    }
    
    // Sort by date (newest first)
    posts.sort((a, b) => b.date - a.date);
    
    console.log(`Processing ${posts.length} blog posts`);
    
    // Create blog directory
    mkdirSync(blogDir, { recursive: true });
    
    // Generate HTML file for each post
    for (const post of posts) {
      const slug = createSlug(post.filename);
      const html = generateBlogPostHTML(post, slug);
      const filePath = resolve(blogDir, `${slug}.html`);
      
      writeFileSync(filePath, html, 'utf-8');
      console.log(`Generated: blog/${slug}.html`);
    }
    
    console.log('Blog pages generated successfully!');
  } catch (error) {
    console.error('Error generating blog pages:', error);
    process.exit(1);
  }
}

generateBlogPages();
