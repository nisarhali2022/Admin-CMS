import Image from 'next/image';
import { createHomepageAnchorId } from '@/lib/homeAnchors'

export const STEPS_HEADING = 'Steps to Participate'

export const HOME_STEPS = [
  {
    num: 1,
    title: 'Install the My Telenor App',
    desc: 'Download from the Google Play Store or Apple App Store and log in with your Telenor number.',
    img: '/assets/install-my-telenor-app.webp',
  },
  {
    num: 2,
    title: 'Log in with Your Telenor SIM',
    desc: 'Start by opening the app and registering with your Telenor number. The login process takes only a moment and gives you full access to in-app offers and quizzes.',
    img: '/assets/login-with-telenor-sim.webp',
  },
  {
    num: 3,
    title: 'Open the Play & Win Section',
    desc: 'Launch the app and remain on the home screen. Scroll down until you see the Telenor Play & Win or Test Your Skills section. Tap on it to proceed.',
    img: '/assets/open-play-win-section.webp',
  },
  {
    num: 4,
    title: 'Answer Five Quiz Questions',
    desc: 'You will see 5 multiple-choice questions on your screen. Read each one carefully and select the best answer. The quiz focuses on general knowledge questions Pakistan users commonly enjoy, making the experience quick and engaging.',
    img: null,
  },
  {
    num: 5,
    title: 'Get Your Free Internet Reward',
    desc: 'After submitting all answers, the app checks your results instantly. Answer all five questions correctly and receive 150 MB of free internet credited directly to your Telenor account.',
    img: '/assets/answer-five-quiz-questions.webp',
  },
];

export default function StepsSection() {
  return (
    <section id={createHomepageAnchorId(STEPS_HEADING)} className="my-8">
      <h2 className="font-heading font-bold text-xl text-text-primary mb-6">
        {STEPS_HEADING}
      </h2>
      <div className="space-y-6">
        {HOME_STEPS.map((step) => (
          <div key={step.num} className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-accent text-white font-bold text-sm flex items-center justify-center">
              {step.num}
            </span>
            <div className="flex-1">
              <h3 id={createHomepageAnchorId(step.title)} className="font-semibold text-text-primary mb-1">{step.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
              {step.img && (
                <div className="mt-3 relative w-80 aspect-[2/3] rounded-lg overflow-hidden shadow-sm border border-border">
                  <Image
                    src={step.img}
                    alt={step.title}
                    fill
                    loading="lazy"
                    className="object-cover"
                    sizes="500px"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
