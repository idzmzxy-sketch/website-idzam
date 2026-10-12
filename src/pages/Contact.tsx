import ContactCard from '../components/ContactCard';

export default function Contact() {
  return (
    <>
      <div className="flex-1 min-h-[2rem]" />

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="lg:max-w-lg xl:max-w-2xl shrink-0">
          <h1 className="text-white text-3xl sm:text-4xl xl:text-5xl font-medium leading-tight drop-shadow-lg">
            Let's talk about your project
          </h1>
          <p className="mt-2 text-white text-sm sm:text-base max-w-xl drop-shadow-lg">
            Send a message or write to us directly. We reply within 24 hours.
          </p>
        </div>
        <ContactCard />
      </div>
    </>
  );
}
