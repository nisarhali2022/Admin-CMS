import { stripHtml } from '@/lib/utils';

// Parse quiz Q&A tables out of WordPress HTML content
export function parseQuizTables(html) {
  if (!html) return [];
  const results = [];

  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tables = html.match(tableRegex) || [];

  for (const table of tables) {
    const text = stripHtml(table).replace(/\s+/g, ' ').trim();
    if (!/answer/i.test(text)) continue;

    const qMatch = text.match(/Question\s*\d+[:\-–]\s*(.+?\?)/i);
    const question = qMatch ? qMatch[1].trim() : '';

    const afterQuestion = qMatch
      ? text.slice(text.indexOf(qMatch[0]) + qMatch[0].length)
      : text;
    const optionMatches = [
      ...afterQuestion.matchAll(/[–—-]\s*([^–—\-]+?)(?=[–—-]|Answer|$)/gi),
    ];
    const options = optionMatches
      .map((m) => m[1].trim())
      .filter((o) => o.length > 0 && !/^answer/i.test(o));

    const answerMatch = text.match(/Answer\s*[👉→:]+\s*(.+?)(?:\s*$)/i);
    const answer = answerMatch ? answerMatch[1].trim() : '';

    if (question || answer) {
      results.push({ question, options, answer });
    }
  }

  return results;
}

// Parse FAQs (Q: ... A: ... pattern) from HTML content
export function parseFaqs(html) {
  if (!html) return [];
  const text = stripHtml(html);
  const faqs = [];
  const qMatches = [...text.matchAll(/Q:\s*(.+?)\s*(?=A:|$)/gs)];
  const aMatches = [...text.matchAll(/A:\s*(.+?)\s*(?=Q:|$)/gs)];
  for (let i = 0; i < Math.min(qMatches.length, aMatches.length); i++) {
    faqs.push({
      q: qMatches[i][1].trim(),
      a: aMatches[i][1].trim(),
    });
  }
  return faqs;
}