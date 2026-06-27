import { createHomepageAnchorId } from '@/lib/homeAnchors'

export const FAQ_HEADING = 'FAQs - My Telenor Answers Today'

const FAQS = [
  {
    q: 'What is today Telenor answer?',
    a: 'Today Telenor answer is the correct daily quiz answer set for the My Telenor app. Users check it before submitting the quiz to win free MBs.',
  },
  {
    q: 'Where can I find My Telenor app answer today?',
    a: 'You can find My Telenor app answer today in the app quiz area, usually under Play & Win, Rewards, Quiz, or Test Your Skills. This page also lists the latest daily answers.',
  },
  {
    q: 'What is today Telenor 5 question answer?',
    a: 'Today Telenor 5 question answer means the full set of five correct answers for the daily My Telenor quiz. Answering all five correctly helps users claim the daily reward.',
  },
  {
    q: 'How do I play Telenor Play and Win today?',
    a: 'Open the My Telenor app, sign in with your Telenor number, go to Play & Win or Quiz, choose the correct answers, and submit them to claim your reward.',
  },
  {
    q: 'What is Test Your Skills today in My Telenor app?',
    a: 'Test Your Skills today is a My Telenor app quiz section where users answer daily questions. Correct answers can unlock free internet MBs or other rewards.',
  },
  {
    q: 'How many MBs can I win from Telenor quiz today?',
    a: 'Telenor quiz today commonly offers up to 150 MB of free internet when users answer the daily quiz questions correctly in the My Telenor app.',
  },
];

export default function FaqSection({ faqs }) {
  // Use parsed FAQs if available, otherwise fall back to hardcoded
  const items = faqs?.length ? faqs : FAQS;

  return (
    <section id={createHomepageAnchorId(FAQ_HEADING)} className="my-8">
      <h2 className="font-heading font-bold text-xl text-text-primary mb-5">
        {FAQ_HEADING}
      </h2>
      <div className="space-y-4">
        {items.map((faq, i) => (
          <div key={i} className="border border-border rounded-lg bg-surface px-4 py-3">
            <p className="font-semibold text-text-primary">
              Q: {faq.q}
            </p>
            <p className="mt-2 text-text-secondary leading-relaxed">
              A: {faq.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
