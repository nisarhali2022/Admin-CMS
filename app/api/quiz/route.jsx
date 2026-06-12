import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const QUIZ_FILE = join(process.cwd(), 'data', 'quiz.json');

function readQuiz() {
  if (!existsSync(QUIZ_FILE)) return null;
  try {
    return JSON.parse(readFileSync(QUIZ_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

// GET — fetch today's quiz
export async function GET() {
  const data = readQuiz();
  return NextResponse.json(data || { questions: [], date: '' });
}

// POST — save quiz (protected by secret)
export async function POST(request) {
  const secret = request.headers.get('x-admin-secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { questions, date } = body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ message: 'Invalid quiz data' }, { status: 400 });
    }

    const payload = { questions, date, updatedAt: new Date().toISOString() };

    // Ensure data/ directory exists
    const { mkdirSync } = await import('fs');
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(QUIZ_FILE, JSON.stringify(payload, null, 2));

    return NextResponse.json({ message: 'Quiz saved', date });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}