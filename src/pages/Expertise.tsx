import {
  Box,
  Globe,
  LayoutDashboard,
  Megaphone,
  Palette,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import PageShell from '../components/PageShell';
import { hrefFor } from '../routes';
import { primaryButtonClass } from '../styles';

const EXPERTISE: { title: string; text: string; Icon: LucideIcon }[] = [
  { title: 'Website', Icon: Globe, text: 'Fast, responsive sites that explain what you do and make people act.' },
  { title: 'Mobile App', Icon: Smartphone, text: 'iOS and Android apps with interfaces that feel natural from the first tap.' },
  { title: 'Web App', Icon: LayoutDashboard, text: 'Dashboards, tools and platforms that run in the browser.' },
  { title: 'E-Commerce', Icon: ShoppingBag, text: 'Stores that load quickly, look sharp and make checkout simple.' },
  { title: 'Visual Identity', Icon: Palette, text: 'Logos, colour and type that give a brand one consistent face.' },
  { title: '3D & Motion', Icon: Box, text: 'Animation and 3D visuals that bring a product to life.' },
  { title: 'Digital Marketing', Icon: Megaphone, text: 'Campaigns and content that reach the right people.' },
  { title: 'Growth & Consulting', Icon: TrendingUp, text: 'Clear advice on what to build next and how to measure it.' },
  { title: 'Other', Icon: Sparkles, text: 'Something that does not fit above? Tell us about it.' },
];

export default function Expertise() {
  return (
    <PageShell
      title="Expertise"
      subtitle="What we can build and improve for you."
      action={
        <a href={hrefFor('contact')} className={primaryButtonClass}>
          Start a project
        </a>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {EXPERTISE.map(({ title, text, Icon }) => (
          <article
            key={title}
            className="glass rounded-2xl p-4 flex flex-col gap-2"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center">
              <Icon size={18} />
            </div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/75">{text}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
