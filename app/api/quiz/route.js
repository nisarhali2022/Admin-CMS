import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { hasAdminSession } from '@/lib/adminAuth';

const WP_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;
const WP_USER = process.env.WP_ADMIN_USER;
const WP_PASS = process.env.WP_ADMIN_PASS;

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

async function saveQuizToWordPress(questions, date) {
  if (!WP_USER || !WP_PASS) {
    throw new Error('WordPress credentials not configured.');
  }

  const authHeader = createAuthHeader(WP_USER, WP_PASS);
  const quizContent = formatQuizContent(questions);
  const title = `Daily Quiz - ${new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}`;
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

function formatQuizContent(questions) {
  let html = '';
  questions.forEach((q, i) => {
    html += `<table><tbody><tr><td>Question ${i + 1}: ${q.question}</td></tr>`;
    q.options.forEach((opt) => {
      html += `<tr><td>– ${opt}</td></tr>`;
    });
    html += `<tr><td>Answer 👉 ${q.answer}</td></tr></tbody></table>`;
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
      return NextResponse.json({ questions: [], date: new Date().toISOString().split('T')[0] });
    }

    const questions = parseQuizContent(post.content.rendered);
    return NextResponse.json({
      questions,
      date: post.modified,
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

        const cellText = cells[0].replace(/<[^>]*>/g, '').trim();

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
    const { questions, date } = body;

    if (!questions || !Array.isArray(questions) || questions.length !== 5) {
      return NextResponse.json(
        { message: 'Invalid quiz data: Must have exactly 5 questions' },
        { status: 400 }
      );
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question?.trim() || !q.answer?.trim() || !Array.isArray(q.options) || q.options.length !== 4) {
        return NextResponse.json(
          { message: `Invalid question ${i + 1}: Must have text, 4 options, and an answer` },
          { status: 400 }
        );
      }
    }

    const post = await saveQuizToWordPress(questions, date);

    // Invalidate cached quiz data so home page shows updated quiz
    revalidateTag('quiz');

    return NextResponse.json({
      message: 'Quiz saved successfully to WordPress',
      data: { questions, date: new Date().toISOString().split('T')[0], id: post.id },
    });
  } catch (err) {
    console.error('Error in POST /api/quiz:', err.message);
    return NextResponse.json(
      { message: 'Error saving quiz: ' + err.message },
      { status: 500 }
    );
  }
}
