import { stripHtml } from './utils';

export function generateTocAndInjectIds(html) {
  if (!html) return { modifiedHtml: '', toc: [] };

  const toc = [];
  
  // Match <h1>, <h2>, <h3>, and <h4> tags and their content
  const regex = /<(h[1234])([^>]*)>(.*?)<\/\1>/gi;
  
  let matchCount = 0;
  
  const modifiedHtml = html.replace(regex, (match, tag, attrs, content) => {
    let id = '';
    const idMatch = attrs.match(/id=["']([^"']+)["']/i);
    
    if (idMatch && idMatch[1]) {
      id = idMatch[1];
    } else {
      // Generate ID from content
      const cleanText = stripHtml(content).trim();
      if (!cleanText) return match; // skip empty headings
      
      id = cleanText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
        
      // Ensure unique ID if multiple headings have same text
      if (toc.some(item => item.id === id)) {
        id = `${id}-${matchCount}`;
      }
    }
    
    toc.push({
      id,
      text: stripHtml(content).trim(),
      level: parseInt(tag.replace('h', ''), 10)
    });
    
    matchCount++;
    
    // If there was no ID, inject it
    if (!idMatch) {
      return `<${tag} id="${id}"${attrs}>${content}</${tag}>`;
    }
    return match;
  });

  return { modifiedHtml, toc };
}
