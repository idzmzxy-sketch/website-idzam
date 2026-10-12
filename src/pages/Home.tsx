import {
  ArrowUpRight,
  BookOpen,
  Globe,
  MessagesSquare,
  Palette,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { SERVICES } from '../constants';
import { hrefFor, type Route } from '../routes';
import { primaryButtonClass, secondaryButtonClass } from '../styles';

const WHAT_WE_DO: { title: string; text: string; Icon: LucideIcon }[] = [
  {
    title: 'Websites & apps',
    text: 'Fast, responsive products for the web and your phone, from the first sketch to launch.',
    Icon: Globe,
  },
  {
    title: 'Brand & visuals',
    text: 'Identity, motion and 3D that make a product look as good as it works.',
    Icon: Palette,
  },
  {
    title: 'Growth & consulting',
    text: 'Clear advice on what to build next and how to measure whether it worked.',
    Icon: TrendingUp,
  },
];

const EXPLORE: { route: Route; title: string; text: string; Icon: LucideIcon }[] = [
  { route: 'chat', title: 'AI Chat', text: 'Ask anything and get an answer right away.', Icon: Sparkles },
  { route: 'community', title: 'Community', text: 'Chat with everyone. Share photos and files.', Icon: MessagesSquare },
  { route: 'work', title: 'Our work', text: 'Pick a background that fits your mood.', Icon: Palette },
  { route: 'story', title: 'Our story', text: 'Posts, photos and links from the community.', Icon: BookOpen },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-10 pb-6">
      {/* Hero */}
      <section className="flex flex-col gap-6 min-h-[calc(100dvh-14rem)] lg:min-h-[calc(100vh-17rem)]">
        <div className="flex-1 min-h-[2rem]" />

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <p className="text-white text-3xl sm:text-4xl xl:text-5xl font-medium leading-tight drop-shadow-lg lg:max-w-lg xl:max-w-2xl shrink-0">
            Idzam crafts bold ideas
            <br />
            and ships them as{' '}
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
              products
            </span>
          </p>

          <div className="w-full lg:w-[min(480px,45%)] shrink-0">
            <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-3">
              <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Hi, welcome 👋</h2>
              <p className="text-sm sm:text-base text-white/85 leading-relaxed">
                Idzam designs and builds websites, apps and brands that look sharp and work well. Take a look
                around, or tell us what you want to make.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a href={hrefFor('work')} className={primaryButtonClass}>
                  See our work
                </a>
                <a href={hrefFor('contact')} className={secondaryButtonClass}>
                  Say hello
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Moving strip of services */}
      <section aria-label="Services" className="glass rounded-2xl overflow-hidden py-3">
        <div className="marquee-track" aria-hidden="true">
          {[...SERVICES, ...SERVICES].map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="mr-3 shrink-0 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium text-white"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* What we do */}
      <section className="flex flex-col gap-3">
        <h2 className="text-white text-xl sm:text-2xl font-semibold tracking-tight drop-shadow-lg">What we do</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {WHAT_WE_DO.map(({ title, text, Icon }) => (
            <article key={title} className="glass rounded-2xl p-5 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon size={20} />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="text-sm text-white/75">{text}</p>
            </article>
          ))}
        </div>
        <a href={hrefFor('expertise')} className="self-start text-sm font-medium text-white underline underline-offset-4 hover:opacity-80">
          See everything we do
        </a>
      </section>

      {/* Explore */}
      <section className="flex flex-col gap-3">
        <h2 className="text-white text-xl sm:text-2xl font-semibold tracking-tight drop-shadow-lg">Explore</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {EXPLORE.map(({ route, title, text, Icon }) => (
            <a
              key={route}
              href={hrefFor(route)}
              className="glass group rounded-2xl p-5 flex flex-col gap-2 transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <ArrowUpRight size={18} className="opacity-60 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="text-sm text-white/75">{text}</p>
            </a>
          ))}
        </div>
      </section>

      <footer className="text-center text-xs text-white/70 drop-shadow">© {new Date().getFullYear()} Idzam. All rights reserved.</footer>
    </div>
  );
}
