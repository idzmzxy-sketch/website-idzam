import { hrefFor } from '../routes';
import { primaryButtonClass, secondaryButtonClass } from '../styles';

export default function Home() {
  return (
    <>
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
              Idzam designs and builds websites, apps and brands that look sharp and work well. Take a
              look around, or tell us what you want to make.
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
    </>
  );
}
