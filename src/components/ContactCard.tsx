import { useState, type FormEvent } from 'react';
import { Twitter, Circle, Instagram, Linkedin } from 'lucide-react';
import SocialBtn from './SocialBtn';
import { EMAIL, SERVICES } from '../constants';
import { inputClass } from '../styles';

export default function ContactCard() {
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const toggle = (service: string) => {
    setSelected((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    setSent(true);
  };

  return (
    <div className="w-full lg:w-[min(480px,45%)] shrink-0">
      <div className="glass rounded-2xl sm:rounded-3xl overflow-hidden p-4 sm:p-6 flex flex-col gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Say hello! 👋</h2>

        <div className="flex flex-row items-center justify-between gap-3 bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5">
          <div className="min-w-0 flex flex-col">
            <span className="text-xs text-white/60">Drop us a line</span>
            <a href={`mailto:${EMAIL}`} className="text-sky-200 font-semibold hover:underline truncate">
              {EMAIL}
            </a>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SocialBtn label="Twitter" className="bg-white/20 text-white">
              <Twitter size={13} />
            </SocialBtn>
            <SocialBtn label="Circle" className="bg-pink-400/25 text-pink-100">
              <Circle size={13} />
            </SocialBtn>
            <SocialBtn label="Instagram" className="bg-orange-400/25 text-orange-100">
              <Instagram size={13} />
            </SocialBtn>
            <SocialBtn label="LinkedIn" className="bg-sky-400/25 text-sky-100">
              <Linkedin size={13} />
            </SocialBtn>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/25" />
          <span className="text-white/60 font-medium text-sm">OR</span>
          <div className="flex-1 h-px bg-white/25" />
        </div>

        {sent ? (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-400/25 text-emerald-100 flex items-center justify-center text-xl">✓</div>
            <h3 className="text-base font-semibold text-white">You're all set!</h3>
            <p className="text-sm text-white/70">Expect a reply within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label htmlFor="vision" className="text-sm font-medium text-white">
              Tell us about your vision
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                name="name"
                placeholder="Full name"
                aria-label="Full name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`flex-1 min-w-0 ${inputClass}`}
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                aria-label="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`flex-1 min-w-0 ${inputClass}`}
              />
            </div>

            <textarea
              id="vision"
              name="message"
              rows={4}
              placeholder="What are you looking to build or improve..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`w-full resize-none ${inputClass}`}
            />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">I need help with...</span>
              <div className="flex flex-wrap gap-1.5">
                {SERVICES.map((service) => {
                  const active = selected.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(service)}
                      className={`text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                        active
                          ? 'chip-active'
                          : 'chip'
                      }`}
                    >
                      {service}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="btn-primary w-full text-sm font-semibold py-3 rounded-2xl disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send my message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
