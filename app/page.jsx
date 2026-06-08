import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getPosts } from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';
import { formatDate, getCategoryColor, truncateText, stripHtml } from '@/lib/utils';
import PostGrid from '@/components/posts/PostGrid';
import Sidebar from '@/components/layout/Sidebar';
import AdBanner from '@/components/ads/AdBanner';
import CategoryMenu from '@/components/navigation/CategoryMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const revalidate = 3600;

export async function generateMetadata() {
  return {
    title: 'Telenor Quiz Today — Get Daily Quiz Answers & Win Free Internet',
    description: SITE_CONFIG.tagline,
    alternates: { canonical: SITE_CONFIG.siteUrl },
    openGraph: {
      title: 'Telenor Quiz Today — Get Daily Quiz Answers & Win Free Internet',
      description: SITE_CONFIG.tagline,
      url: SITE_CONFIG.siteUrl,
      siteName: SITE_CONFIG.siteName,
      type: 'website',
      images: [{ url: `${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Telenor Quiz Today — Get Daily Quiz Answers & Win Free Internet',
      description: SITE_CONFIG.tagline,
      images: [`${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}`],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extracts quiz Q&A from WordPress post HTML.
// The homepage post stores quiz questions inside <table> blocks.
// Each table cell contains: Question text, options separated by dashes, Answer.
// ─────────────────────────────────────────────────────────────────────────────
function parseQuizFromContent(html) {
  if (!html) return [];

  const questions = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = [...html.matchAll(tableRegex)];

  for (const table of tables) {
    const raw = stripHtml(table[1]).replace(/\s+/g, ' ').trim();

    // Only process cells that contain an answer marker
    if (!raw.toLowerCase().includes('answer')) continue;

    // Extract question number + text (before first option dash)
    const questionMatch = raw.match(/Question\s*\d+:\s*(.+?)\s*(?:[–\-](?!\s*Answer))/i);
    const question = questionMatch ? questionMatch[1].trim() : '';

    // Extract options: words after – or - that are not the answer line
    const optionMatches = [...raw.matchAll(/(?:^|[–\-])\s*([A-Z][a-zA-Z\s]{1,30})(?=\s*[–\-]|\s*Answer)/g)];
    const options = optionMatches
      .map((m) => m[1].trim())
      .filter((o) => o.length > 1 && !o.toLowerCase().startsWith('question'));

    // Extract answer after the 👉 emoji or Answer: marker
    const answerMatch = raw.match(/Answer\s*[👉:→\-–]+\s*([A-Za-z][^\n\r]+?)(?:\s*$|\s{2,})/i);
    const answer = answerMatch ? answerMatch[1].trim() : '';

    if (question && answer) {
      questions.push({ question, options, answer });
    }
  }

  return questions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz Section — rendered server-side, auto-updates with the WP post
// ─────────────────────────────────────────────────────────────────────────────
function QuizSection({ questions, postSlug }) {
  if (!questions || questions.length === 0) return null;

  const today = new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <section className="bg-gradient-to-br from-[#1e3a5f] to-[#2a5298] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section Header ── */}
        <div className="text-center mb-8">
          <span className="inline-block bg-accent text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-4">
            Daily Quiz
          </span>
          <h2 className="font-merriweather font-bold text-2xl sm:text-3xl text-white mb-3">
            Telenor Quiz Today — {today}
          </h2>
          <p className="text-blue-200 text-sm max-w-lg mx-auto leading-relaxed">
            Answer all 5 questions correctly in the{' '}
            <span className="text-white font-semibold">My Telenor App</span> to
            win <span className="text-accent font-bold">150 MB free internet</span> instantly.
          </p>
        </div>

        {/* ── Question Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {questions.map((q, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-5 shadow-lg border border-blue-100 flex flex-col gap-4"
            >
              {/* Question */}
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-white text-sm font-bold flex items-center justify-center shadow">
                  {index + 1}
                </span>
                <p className="font-semibold text-text-primary text-sm leading-snug pt-1">
                  {q.question}
                </p>
              </div>

              {/* Options */}
              {q.options.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-11">
                  {q.options.map((opt, i) => {
                    const isAnswer =
                      opt.toLowerCase().trim() === q.answer.toLowerCase().trim();
                    return (
                      <span
                        key={i}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          isAnswer
                            ? 'bg-green-50 border-green-400 text-green-700 font-bold'
                            : 'bg-surface border-border text-text-secondary'
                        }`}
                      >
                        {isAnswer && '✓ '}
                        {opt}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Answer Badge */}
              <div className="pl-11">
                <span className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  👉 Answer: {q.answer}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Info Strip ── */}
        <div className="bg-white/10 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="text-center sm:text-left">
            <p className="text-white font-semibold text-sm mb-1">
              How to claim your reward?
            </p>
            <p className="text-blue-200 text-xs">
              Open <strong className="text-white">My Telenor App</strong> → Play &amp; Win → Test Your Skills → Answer all 5 → Get 150 MB free
            </p>
          </div>
          
            href="https://play.google.com/store/apps/details?id=com.telenor.pakistan.mytelenor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-5 py-2.5 bg-accent text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors text-sm whitespace-nowrap"
          >
            Open My Telenor App →
          </a>
        </div>

        {/* ── Link to full quiz post ── */}
        {postSlug && (
          <p className="text-center text-blue-200 text-xs">
            Want the full explanation?{' '}
            <Link
              href={`/${postSlug}`}
              className="text-white underline hover:text-accent transition-colors"
            >
              Read today&apos;s quiz post →
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// About / How-to Section — summarised from site content, not copied verbatim
// ─────────────────────────────────────────────────────────────────────────────
function HowToSection() {
  const steps = [
    {
      icon: '📲',
      title: 'Install My Telenor App',
      desc: 'Download from Google Play Store or Apple App Store and log in with your Telenor number.',
    },
    {
      icon: '🎯',
      title: 'Open Play & Win',
      desc: 'From the home screen scroll to the "Test Your Skills" or "Play & Win" section and tap it.',
    },
    {
      icon: '❓',
      title: 'Answer 5 Questions',
      desc: 'Read each multiple-choice question carefully and select the correct option before time runs out.',
    },
    {
      icon: '🎁',
      title: 'Claim 150 MB Free',
      desc: 'After all correct answers the app credits 150 MB of free internet data to your account instantly.',
    },
  ];

  const eligibility = [
    'All Telenor prepaid and postpaid SIM users',
    'Dual-SIM phone users with Telenor as secondary SIM',
    'No special package required — only a small amount of data to open the app',
    'One attempt per SIM per day — resets at midnight',
  ];

  return (
    <section className="py-12 bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Steps */}
        <div className="text-center mb-8">
          <h2 className="font-merriweather font-bold text-2xl text-text-primary mb-2">
            How to Win Free Internet Daily
          </h2>
          <p className="text-text-secondary text-sm max-w-xl mx-auto">
            The Telenor daily quiz takes under two minutes and rewards you with 150 MB of free data every day.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {steps.map((step, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-4xl mb-3">{step.icon}</div>
              <h3 className="font-merriweather font-bold text-sm text-text-primary mb-2">
                {step.title}
              </h3>
              <p className="text-text-secondary text-xs leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Eligibility */}
        <div className="bg-white rounded-xl border border-border p-6 max-w-2xl mx-auto">
          <h3 className="font-merriweather font-bold text-base text-text-primary mb-4 text-center">
            Who Can Participate?
          </h3>
          <ul className="space-y-2">
            {eligibility.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default async function HomePage() {
  const data = await getPosts({ page: 1, perPage: 11 });
  const posts = data?.posts || [];

  const heroPost = posts[0] || null;
  const gridPosts = posts.slice(1);

  // Parse today's quiz from the most recent post content
  const quizQuestions = parseQuizFromContent(heroPost?.content?.rendered || '');

  const heroImage =
    heroPost?._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
  const heroCategory =
    heroPost?._embedded?.['wp:term']?.[0]?.[0] || null;
  const heroExcerpt = heroPost
    ? truncateText(stripHtml(heroPost.excerpt?.rendered || ''), 160)
    : '';

  return (
    <main>

      {/* ── 1. Quiz Answers Section ── */}
      <QuizSection
        questions={quizQuestions}
        postSlug={heroPost?.slug || ''}
      />

      {/* ── 2. Hero / Latest Post Banner ── */}
      {heroPost && (
        <section className="relative w-full h-[380px] sm:h-[460px] overflow-hidden bg-primary">
          {heroImage && (
            <Image
              src={heroImage}
              alt={stripHtml(heroPost.title?.rendered || '')}
              fill
              priority
              className="object-cover opacity-40"
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          <div className="relative z-10 flex flex-col justify-end h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            {heroCategory && (
              <Link
                href={`/category/${heroCategory.slug}`}
                className={`inline-block self-start mb-3 px-3 py-1 rounded-full text-xs font-semibold text-white ${getCategoryColor(heroCategory.slug)}`}
              >
                {heroCategory.name}
              </Link>
            )}

            <Link href={`/${heroPost.slug}`} className="group">
              <h1
                className="font-merriweather font-bold text-white text-2xl sm:text-4xl leading-tight mb-3 line-clamp-2 group-hover:text-accent transition-colors"
                dangerouslySetInnerHTML={{ __html: heroPost.title?.rendered }}
              />
            </Link>

            {heroExcerpt && (
              <p className="text-gray-200 text-sm sm:text-base mb-4 max-w-2xl line-clamp-2">
                {heroExcerpt}
              </p>
            )}

            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-xs">
                {formatDate(heroPost.date)}
              </span>
              <Link
                href={`/${heroPost.slug}`}
                className="px-5 py-2 bg-accent text-white rounded font-medium text-sm hover:bg-orange-600 transition-colors"
              >
                Read More →
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── 3. Top Ad ── */}
        <div className="mt-6">
          <AdBanner position="top" />
        </div>

        {/* ── 4. Latest Posts + Sidebar ── */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <section>
            <h2 className="font-merriweather font-bold text-xl text-text-primary mb-5">
              Latest Posts
            </h2>
            <PostGrid posts={gridPosts} />
          </section>

          <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}>
            <Sidebar />
          </Suspense>
        </div>

        {/* ── 5. Categories ── */}
        <Suspense fallback={null}>
          <CategoryMenu />
        </Suspense>

        {/* ── 6. Bottom Ad ── */}
        <div className="mb-10">
          <AdBanner position="bottom" />
        </div>
      </div>

      {/* ── 7. How-To + Eligibility Section ── */}
      <HowToSection />

    </main>
  );
}