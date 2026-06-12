import { stripHtml } from '@/lib/utils';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const QUIZ_FILE = join(process.cwd(), 'data', 'quiz.json');

// Get today's date string in Karachi timezone: "2026-06-11"
export function getTodayKarachi() {
  const d = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })
  );
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Get formatted display date in Karachi: "11 June 2026"
export function getTodayLabelKarachi() {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

// Read quiz saved by admin panel
// Returns questions if date matches today (Karachi), otherwise null
export function readSavedQuiz() {
  try {
    if (!existsSync(QUIZ_FILE)) return null;
    const data = JSON.parse(readFileSync(QUIZ_FILE, 'utf-8'));
    if (!data?.questions?.length) return null;
    // Only return if it's today's quiz (Karachi date)
    if (data.date && data.date !== getTodayKarachi()) return null;
    return data.questions;
  } catch {
    return null;
  }
}

// Parse quiz Q&A tables out of WordPress HTML content (fallback)
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