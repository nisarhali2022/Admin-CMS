import { decodeHtmlEntities, stripHtml } from '@/lib/utils';
import { getKarachiDateISO, getKarachiDateLabel } from '@/lib/date';

// Get today's date string in Karachi timezone: "2026-06-11"
export function getTodayKarachi() {
  return getKarachiDateISO();
}

// Get formatted display date in Karachi: "11 June 2026"
export function getTodayLabelKarachi() {
  return getKarachiDateLabel();
}

// Read quiz saved by admin panel
// Returns questions if date matches today (Karachi), otherwise null
// NOTE: Quiz data is now saved to WordPress via /api/quiz
export function parseQuizTables(html) {
  if (!html) return [];
  const results = [];
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tables = html.match(tableRegex) || [];

  for (const table of tables) {
    const text = decodeHtmlEntities(stripHtml(table))
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!/answer/i.test(text)) {
      continue;
    }

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

    if (question || answer) results.push({ question, options, answer });
  }

  return results;
}

// Parse FAQs from HTML
export function parseFaqs(html) {
  if (!html) return [];
  const text = stripHtml(html);
  const faqs = [];
  const qMatches = [...text.matchAll(/Q:\s*(.+?)\s*(?=A:|$)/gs)];
  const aMatches = [...text.matchAll(/A:\s*(.+?)\s*(?=Q:|$)/gs)];
  for (let i = 0; i < Math.min(qMatches.length, aMatches.length); i++) {
    faqs.push({ q: qMatches[i][1].trim(), a: aMatches[i][1].trim() });
  }
  return faqs;
}
