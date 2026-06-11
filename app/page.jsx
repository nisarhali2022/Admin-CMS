import { Suspense } from 'react';
import Link from 'next/link';
import { getPosts } from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';
import { stripHtml, truncateText } from '@/lib/utils';
import { parseQuizTables, parseFaqs } from '@/lib/quizParser';

import Sidebar from '@/components/layout/Sidebar';
import AdBanner from '@/components/ads/AdBanner';
import AdInArticle from '@/components/ads/AdInArticle';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LCPPreloader from '@/components/ui/LCPPreloader';

import QuizAnswerCards from '@/components/home/QuizAnswerCards';
import LatestNewsGrid from '@/components/home/LatestNewsGrid';
import StepsSection from '@/components/home/StepsSection';
import FaqSection from '@/components/home/FaqSection';
import QuizInfoSections from '@/components/home/QuizInfoSections';

export const revalidate = 3600;

export async function generateMetadata() {
  const data = await getPosts({ page: 1, perPage: 1 });
  const post = data?.posts?.[0];
  const yoast = post?.yoast_head_json;

  const title =
    yoast?.title ||
    (post?.title?.rendered
      ? `${stripHtml(post.title.rendered)} - Latest My Telenor Answer Today`
      : 'Telenor Quiz Today — Get Daily Quiz Answers & Win Free Internet');
  const description =
    yoast?.description ||
    'Get all correct Telenor Quiz Today. Check daily updated my Telenor answers today to boost your score instantly and win exciting rewards.';
  const ogImage =
    post?._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
    `${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}`;

  return {
    title,
    description,
    alternates: { canonical: SITE_CONFIG.siteUrl },
    openGraph: {
      title, description,
      url: SITE_CONFIG.siteUrl,
      siteName: SITE_CONFIG.siteName,
      type: 'website',
      images: [{ url: ogImage }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

export default async function HomePage() {
  const [quizData, newsData] = await Promise.all([
    getPosts({ page: 1, perPage: 1 }),
    getPosts({ page: 1, perPage: 6 }),
  ]);

  const quizPost = quizData?.posts?.[0] || null;
  const newsPosts = newsData?.posts || [];
  const quizQuestions = parseQuizTables(quizPost?.content?.rendered || '');
  const faqs = parseFaqs(quizPost?.content?.rendered || '');
  const postTitle = quizPost?.title?.rendered || '';

  // Extract first news post image for LCP preloading
  const firstNewsImage = newsPosts?.[0]?._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;

  const todayLabel = new Intl.DateTimeFormat('en-PK', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());

  return (
    <main id="main">
      {/* Preload the first news image with high priority for LCP optimization */}
      {firstNewsImage && (
        <LCPPreloader
          imageUrl={firstNewsImage}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* ── Main Content ── */}
          <article>
            {/* Title */}
            <h1
              className="font-merriweather font-bold text-2xl sm:text-3xl text-text-primary leading-tight mb-4"
              dangerouslySetInnerHTML={{ __html: postTitle }}
            />

            {/* Intro */}
            <div className="text-text-secondary text-sm sm:text-base leading-relaxed space-y-3 mb-6">
              <p>
                <strong>
                  <Link href="/" className="text-accent hover:underline">Telenor quiz today</Link>
                </strong>{' '}
                is a popular daily feature inside the My Telenor app. It gives Telenor users a simple
                way to earn free internet MBs, balance, and bonus rewards by answering a few quick
                questions each day.
              </p>
              <p>
                We update the today Telenor 5 question answer every day so you never miss a winning
                chance. Even if you use a dual SIM phone with{' '}
                <a href="https://jazz.com.pk/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-semibold">Jazz</a>,{' '}
                <a href="https://www.zong.com.pk/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-semibold">Zong</a>, or{' '}
                <a href="https://www.ufone.com/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-semibold">Ufone</a>{' '}
                as your main number, you can still participate using your Telenor SIM in the second slot.
              </p>
            </div>

            {/* Top Ad */}
            <AdBanner position="top" />

            {/* Quiz Answers */}
            <section className="my-6" id="quiz-answers">
              <h2 className="font-merriweather font-bold text-xl text-text-primary mb-4">
                Today Telenor Answer {todayLabel}
              </h2>
              <QuizAnswerCards questions={quizQuestions} />
            </section>

            {/* In-Article Ad */}
            <AdInArticle />

            {/* Latest News */}
            <LatestNewsGrid posts={newsPosts} />

            {/* Static info sections */}
            <QuizInfoSections />

            {/* Steps */}
            <StepsSection />

            {/* Mid Ad */}
            <AdBanner position="mid" />

            {/* FAQs */}
            <FaqSection faqs={faqs} />

            {/* Bottom Ad */}
            <AdBanner position="bottom" />
          </article>

          {/* ── Sidebar ── */}
          <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}>
            <Sidebar />
          </Suspense>
        </div>
      </div>
    </main>
  );
}