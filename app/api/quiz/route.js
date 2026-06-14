import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { hasAdminSession } from '@/lib/adminAuth';
import { getKarachiDateISO, getKarachiDateLabel } from '@/lib/date';
import { decodeHtmlEntities } from '@/lib/utils';

const WP_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;
const WP_USER = process.env.WP_ADMIN_USER;
const WP_PASS = process.env.WP_ADMIN_PASS;
const MAX_QUESTION_LENGTH = 300;
const MAX_OPTION_LENGTH = 150;

function createAuthHeader(user, pass) {
  const credentials = Buffer.from(`${user}:${pass}`).toString('base64');
  return `Basic ${credentials}`;
}

async function getMainQuizPost() {
  try {
    const res = await fetch(`${WP_API_URL}/posts?slug=daily-quiz&per_page=1`, {
      headers: { 'Accept': 'application/json' },
    });
    const posts = await res.json();
    return posts?.length > 0 ? posts[0] : null;
  } catch (err) {
    console.error('Error fetching main quiz post:', err);
    return null;
  }
}

async function saveQuizToWordPress(questions) {
  if (!WP_USER || !WP_PASS) {
    throw new Error('WordPress credentials not configured.');
  }

  const authHeader = createAuthHeader(WP_USER, WP_PASS);
  const quizContent = formatQuizContent(questions);
  const title = `Daily Quiz - ${getKarachiDateLabel()}`;
  const slug = 'daily-quiz';

  const existing = await getMainQuizPost();

  const postData = {
    title,
    content: quizContent,
    slug,
    status: 'publish',
    categories: [],
  };

  const method = existing ? 'PUT' : 'POST';
  const endpoint = existing
    ? `${WP_API_URL}/posts/${existing.id}`
    : `${WP_API_URL}/posts`;

  try {
    const res = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || `WordPress API error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('Error saving to WordPress:', err);
    throw err;
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeQuizQuestions(questions) {
  if (!Array.isArray(questions) || questions.length !== 5) {
    throw new Error('Quiz must have exactly 5 questions.');
  }

  return questions.map((item, index) => {
    const question =
      typeof item?.question === 'string' ? item.question.trim() : '';
    const answer =
      typeof item?.answer === 'string' ? item.answer.trim() : '';
    const options = Array.isArray(item?.options)
      ? item.options.map((option) =>
          typeof option === 'string' ? option.trim() : ''
        )
      : [];

    if (!question || question.length > MAX_QUESTION_LENGTH) {
      throw new Error(
        `Question ${index + 1} must contain 1-${MAX_QUESTION_LENGTH} characters.`
      );
    }

    if (
      options.length !== 4 ||
      options.some(
        (option) => !option || option.length > MAX_OPTION_LENGTH
      )
    ) {
      throw new Error(
        `Question ${index + 1} must have 4 non-empty options of at most ${MAX_OPTION_LENGTH} characters.`
      );
    }

    const matchingOption = options.find(
      (option) => option.toLowerCase() === answer.toLowerCase()
    );

    if (!matchingOption) {
      throw new Error(
        `Question ${index + 1} answer must match one of its options.`
      );
    }

    return {
      question,
      options,
      answer: matchingOption,
    };
  });
}

function formatQuizContent(questions) {
  let html = '';
  questions.forEach((q, i) => {
    html += `<table><tbody><tr><td>Question ${i + 1}: ${escapeHtml(q.question)}</td></tr>`;
    q.options.forEach((opt) => {
      html += `<tr><td>– ${escapeHtml(opt)}</td></tr>`;
    });
    html += `<tr><td>Answer 👉 ${escapeHtml(q.answer)}</td></tr></tbody></table>`;
  });
  return html;
}

export async function GET(request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const post = await getMainQuizPost();
    if (!post) {
      return NextResponse.json({ questions: [], date: getKarachiDateISO() });
    }

    const questions = parseQuizContent(post.content.rendered);
    return NextResponse.json({
      questions,
      date: getKarachiDateISO(),
      id: post.id,
    });
  } catch (err) {
    return NextResponse.json(
      { message: 'Error fetching quiz: ' + err.message },
      { status: 500 }
    );
  }
}

function parseQuizContent(content) {
  try {
    if (!content) return [];
    
    // Match ALL tables, not just the first one
    const tableMatches = [...content.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)];
    if (tableMatches.length === 0) return [];

    const questions = [];

    for (const tableMatch of tableMatches) {
      const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
      let question = '';
      let options = [];
      let answer = '';

      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
        if (cells.length === 0) continue;

        const cellText = decodeHtmlEntities(
          cells[0].replace(/<[^>]*>/g, '').trim()
        );

        if (/^Question\s+\d+:/i.test(cellText)) {
          const match = cellText.match(/^Question\s+\d+:\s*(.+?)$/i);
          question = match ? match[1] : cellText;
        } else if (/^–\s*/.test(cellText)) {
          options.push(cellText.replace(/^–\s*/, ''));
        } else if (/^Answer\s*👉/.test(cellText)) {
          const match = cellText.match(/^Answer\s*👉\s*(.+?)$/);
          answer = match ? match[1] : cellText;
        }
      }

      if (question && answer) {
        questions.push({ question, options: options.slice(0, 4), answer });
      }
    }

    return questions;
  } catch (err) {
    console.error('Error parsing quiz content:', err);
    return [];
  }
}

export async function POST(request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { questions } = body;

    let normalizedQuestions;
    try {
      normalizedQuestions = normalizeQuizQuestions(questions);
    } catch (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    const post = await saveQuizToWordPress(normalizedQuestions);

    // Invalidate cached quiz data so home page shows updated quiz
    revalidateTag('quiz');

    return NextResponse.json({
      message: 'Quiz saved successfully to WordPress',
      data: {
        questions: normalizedQuestions,
        date: getKarachiDateISO(),
        id: post.id,
      },
    });
  } catch (err) {
    console.error('Error in POST /api/quiz:', err.message);
    return NextResponse.json(
      { message: 'Error saving quiz: ' + err.message },
      { status: 500 }
    );
  }
}
