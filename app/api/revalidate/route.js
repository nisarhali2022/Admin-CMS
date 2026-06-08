import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const secret = request.headers.get('x-revalidate-secret');

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { slug, type } = body;

    // Always revalidate homepage
    revalidatePath('/');

    if (slug) {
      if (type === 'category') {
        revalidatePath(`/category/${slug}`);
      } else {
        // Default: treat as post
        revalidatePath(`/${slug}`);
      }
    }

    return NextResponse.json({
      revalidated: true,
      slug,
      type,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { message: 'Invalid request body', error: err.message },
      { status: 400 }
    );
  }
}