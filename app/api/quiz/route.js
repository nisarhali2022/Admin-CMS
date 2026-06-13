import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';

// Get path to quiz.json in data folder
function getQuizFilePath() {
  return join(process.cwd(), 'data', 'quiz.json');
}

// Read quiz data from JSON file
async function readQuizFile() {
  try {
    const filePath = getQuizFilePath();
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading quiz file:', err);
    return { questions: [], date: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
}

// Write quiz data to JSON file
async function writeQuizFile(data) {
  try {
    const filePath = getQuizFilePath();
    const quizData = {
      questions: data.questions,
      date: data.date,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(filePath, JSON.stringify(quizData, null, 2), 'utf-8');
    return quizData;
  } catch (err) {
    console.error('Error writing quiz file:', err);
    throw new Error('Failed to save quiz data');
  }
}

export async function GET(request) {
  try {
    const quizData = await readQuizFile();
    return NextResponse.json(quizData);
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

    // Save to JSON file
    const savedData = await writeQuizFile({ 
      questions, 
      date: date || new Date().toISOString().split('T')[0] 
    });

    return NextResponse.json({
      message: 'Quiz saved successfully to local JSON',
      ...savedData,
    });
  } catch (err) {
    console.error('POST error:', err);
    return NextResponse.json(
      { message: err.message || 'Error saving quiz' },
      { status: 500 }
    );
  }
}
