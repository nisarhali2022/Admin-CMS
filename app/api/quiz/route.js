import { NextResponse } from 'next/server';

const WP_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;
const WP_USER = process.env.WP_ADMIN_USER; // WordPress admin username
const WP_PASS = process.env.WP_ADMIN_PASS; // WordPress admin password (app password)

// Helper: Create Basic Auth header for WordPress
function createAuthHeader(user, pass) {
  const credentials = Buffer.from(`${user}:${pass}`).toString('base64');
  return `Basic ${credentials}`;
}

// Helper: Get today's quiz post
async function getTodayQuizPost() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${WP_API_URL}/posts?search=quiz-${today}&per_page=1`, {
      headers: { 'Accept': 'application/json' },
    });
    const posts = await res.json();
    return posts?.length > 0 ? posts[0] : null;
  } catch (err) {
    console.error('Error fetching quiz post:', err);
    return null;
  }
}

// Helper: Create or update quiz post in WordPress
async function saveQuizToWordPress(questions, date) {
  if (!WP_USER || !WP_PASS) {
    throw new Error('WordPress credentials not configured. Set WP_ADMIN_USER and WP_ADMIN_PASS.');
  }

  const authHeader = createAuthHeader(WP_USER, WP_PASS);
  const quizContent = formatQuizContent(questions);
  const title = `Quiz - ${date}`;
  const slug = `quiz-${date}`;

  // Check if quiz already exists
  const existing = await getTodayQuizPost();

  const postData = {
    title,
    content: quizContent,
    slug,
    status: 'publish',
    categories: [], // Customize as needed
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

// Format questions in the exact format parseQuizTables expects
// Each question gets its own <table> so the parser processes them independently
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

// Parse quiz content from WordPress HTML
function parseQuizContent(content) {
  // Extract questions from WordPress content
  // This is a simplified parser - adjust based on your actual format
  try {
    const tableMatch = content.match(/<table[^>]*>([\s\S]*?)<\/table>/);
    if (!tableMatch) return [];

    const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    const questions = [];

    rows.slice(1).forEach((row) => {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      if (cells.length >= 4) {
        const question = cells[1].replace(/<[^>]*>/g, '').trim();
        const optionsText = cells[2].replace(/<[^>]*>/g, '').trim();
        const answer = cells[3].replace(/<[^>]*>/g, '').trim();

        if (question) {
          questions.push({
            question,
            options: optionsText.split(',').map(o => o.trim()),
            answer: answer.replace(/^\*\*/, '').replace(/\*\*$/, ''), // Remove ** markers
          });
        }
      }
    });

    return questions;
  } catch (err) {
    console.error('Error parsing quiz content:', err);
    return [];
  }
}

export async function GET(request) {
  try {
    const post = await getTodayQuizPost();
    if (!post) {
      return NextResponse.json({ questions: [], date: new Date().toISOString().split('T')[0] });
    }

    const questions = parseQuizContent(post.content.rendered);
    return NextResponse.json({
      questions,
      date: post.slug.replace('quiz-', ''),
      id: post.id,
    });
  } catch (err) {
    return NextResponse.json(
      { message: 'Error fetching quiz: ' + err.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  // Verify admin secret
  const secret = request.headers.get('x-admin-secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { message: 'Unauthorized: Invalid admin secret' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { questions, date } = body;

    // Validate
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

    // Check if WordPress credentials are set
    if (!WP_USER || !WP_PASS) {
      console.error('WordPress credentials missing:', { WP_USER: !!WP_USER, WP_PASS: !!WP_PASS });
      return NextResponse.json(
        { message: 'Server error: WordPress credentials not configured. Contact admin.' },
        { status: 500 }
      );
    }

    // Log quiz content before saving
    const quizContent = formatQuizContent(questions);
    console.log('=== QUIZ SAVE LOG ===');
    console.log('Input Questions:', JSON.stringify(questions, null, 2));
    console.log('Formatted Content for WordPress:', quizContent);
    console.log('=====================');

    // Save to WordPress
    const post = await saveQuizToWordPress(questions, date || new Date().toISOString().split('T')[0]);

    return NextResponse.json({
      message: 'Quiz saved successfully to WordPress',
      data: { questions, date: post.slug.replace('quiz-', ''), id: post.id },
    });
  } catch (err) {
    console.error('Error in POST /api/quiz:', err.message);
    return NextResponse.json(
      { message: 'Error saving quiz: ' + err.message },
      { status: 500 }
    );
  }
}
