import { Suspense } from 'react';
import Link from 'next/link';
import { getDailyQuizPost, getLatestPostCards } from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';
import {
  getKarachiDateLabel,
  getSeoKarachiDateLabel,
  getSeoKarachiDayStartISO,
} from '@/lib/date';
import { buildMetadata } from '@/lib/seo';
import { parseQuizTables, parseFaqs } from '@/lib/quizParser';
import { serializeJsonLd } from '@/lib/schema';
import { createHomepageAnchorId } from '@/lib/homeAnchors';
import { LATEST_NEWS_HEADING } from '@/lib/homeHeadings';

import Sidebar from '@/components/layout/Sidebar';
import AdBanner from '@/components/ads/AdBanner';
import AdInArticle from '@/components/ads/AdInArticle';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TableOfContents from '@/components/posts/TableOfContents';

import QuizAnswerCards from '@/components/home/QuizAnswerCards';
import LatestNewsGrid from '@/components/home/LatestNewsGrid';
import StepsSection, { HOME_STEPS, STEPS_HEADING } from '@/components/home/StepsSection';
import FaqSection, { FAQ_HEADING } from '@/components/home/FaqSection';
import QuizInfoSections, {
  CONCLUSION_HEADING,
  ConclusionSection,
  QUIZ_INFO_HEADINGS,
} from '@/components/home/QuizInfoSections';

export const revalidate = 3600;

const QUICK_ANSWER_HEADING = 'Quick Answer - Today Telenor Answer';

function createTocItem(text, level) {
  return {
    id: createHomepageAnchorId(text),
    text,
    level,
  };
}

function buildHomeToc(articleTitle, quizHeading) {
  return [
    createTocItem(articleTitle, 1),
    createTocItem(QUICK_ANSWER_HEADING, 2),
    createTocItem(quizHeading, 2),
    createTocItem(LATEST_NEWS_HEADING, 2),
    ...Object.values(QUIZ_INFO_HEADINGS).map((heading) =>
      createTocItem(heading, 2)
    ),
    createTocItem(STEPS_HEADING, 2),
    ...HOME_STEPS.map((step) => createTocItem(step.title, 3)),
    createTocItem(FAQ_HEADING, 2),
    createTocItem(CONCLUSION_HEADING, 2),
  ];
}

export async function generateMetadata() {
  const post = await getDailyQuizPost();
  const seoDateLabel = getSeoKarachiDateLabel();

  const title = `Today Telenor Answer ${seoDateLabel} - My Telenor Quiz Answers`;
  const description = `Check today Telenor answer for the My Telenor app quiz. Get all 5 correct Telenor quiz answers today and win free internet MBs daily.`;
  const ogImage =
    post?._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
    `${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}`;

  return buildMetadata({
    title,
    description,
    path: '/',
    image: ogImage,
    absoluteTitle: true,
  });
}

export default async function HomePage() {
  const [quizPost, newsData] = await Promise.all([
    getDailyQuizPost(),
    getLatestPostCards(60),
  ]);

  const newsPosts = newsData || [];
  const quizQuestions = parseQuizTables(quizPost?.content?.rendered || '');
  const faqs = parseFaqs(quizPost?.content?.rendered || '');

  const todayLabel = getKarachiDateLabel();
  const seoDateLabel = getSeoKarachiDateLabel();
  const seoTitle = `Today Telenor Answer ${seoDateLabel} - My Telenor Quiz Answers`;
  const seoDescription = `Check today Telenor answer for the My Telenor app quiz. Get all 5 correct Telenor quiz answers today and win free internet MBs daily.`;
  const articleTitle = `Today Telenor Answer ${todayLabel} - My Telenor Quiz Answers`;
  const quizHeading = `Today Telenor 5 Question Answer ${todayLabel}`;
  const homeToc = buildHomeToc(articleTitle, quizHeading);
  const homepageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_CONFIG.siteUrl}/#webpage`,
    url: SITE_CONFIG.siteUrl,
    name: seoTitle,
    description: seoDescription,
    inLanguage: 'en-PK',
    isPartOf: { '@id': `${SITE_CONFIG.siteUrl}/#website` },
    dateModified: getSeoKarachiDayStartISO(),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homepageSchema) }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">

          {/* Main Content */}
          <article className="min-w-0">
            {/* Title */}
      
            <h1
              id={createHomepageAnchorId(articleTitle)}
              className="font-heading font-bold text-2xl sm:text-3xl text-text-primary leading-tight mb-4"
            >
              {articleTitle}</h1>

            {/* Intro */}
            <div className="text-text-secondary sm:text-base leading-relaxed space-y-3 mb-6">
              <p>
                <strong>
                  <Link href="/" className="text-accent hover:underline">Telenor quiz today</Link>
                </strong>{' '}
                is a popular daily feature inside the My Telenor app question answer section. It gives Telenor users a simple way to earn free internet MBs, balance, and bonus rewards. You just answer a few quick questions and enjoy instant benefits while learning something new.
              </p>
              <p>
                <Link href="/" className="text-accent hover:underline"><strong>Telenor Answer Today</strong></Link>{' '}
                suits every type of user. Students can grab extra data for online classes, freelancers can stay connected for work, and regular users can collect daily rewards without any hassle. The quiz takes only a few seconds, and the questions stay easy, relevant, and engaging.
              </p>
              <p>
                We update the today Telenor 5 question answer every day so you never miss a winning chance. Even if you use a dual SIM phone with{' '}
                <strong>
                  <a href="https://jazz.com.pk/" target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">Jazz</a>,{' '}
                  <a href="https://www.zong.com.pk/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Zong</a>, or{' '}
                  <a href="https://www.ufone.com/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Ufone</a>
                </strong>
                {' '}as your main number, you can still participate using your Telenor SIM in the second slot. This makes the Telenor daily quiz accessible, fast, and convenient for everyone.
              </p>
            </div>

            <section
              id={createHomepageAnchorId(QUICK_ANSWER_HEADING)}
              className="my-6 rounded-xl border border-primary/20 bg-primary/5 p-5"
            >
              <h2 className="font-heading font-bold text-xl text-text-primary mb-3">
                {QUICK_ANSWER_HEADING}
              </h2>
              <p className="sm:text-base leading-relaxed text-text-secondary">
                Today&apos;s My Telenor quiz answers are listed below. Open the
                My Telenor app, go to the Play &amp; Win or Test Your Skills
                section, enter the correct answers, and claim your free MBs
                after completing the daily quiz.
              </p>
            </section>

            <TableOfContents toc={homeToc} />

            {/* Top Ad */}
            <AdBanner position="top" />

            {/* Quiz Answers */}
            <section className="my-6" id={createHomepageAnchorId(quizHeading)}>
              <h2 className="font-heading font-bold text-xl text-text-primary mb-4">
                {quizHeading}
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

            {/* Conclusion */}
            <ConclusionSection />

            {/* Bottom Ad */}
            <AdBanner position="bottom" />
          </article>

          {/* Sidebar */}
          <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}>
            <Sidebar />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
