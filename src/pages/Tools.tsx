import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Wand2 } from 'lucide-react';
import PageShell from '../components/PageShell';
import AmpremTool from '../tools/AmpremTool';
import { useRoute } from '../routes';

interface ToolEntry {
  id: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}

const TOOLS: ToolEntry[] = [
  {
    id: 'amprem',
    title: 'AlightMotion Premium',
    description: 'Generate premium access with two servers and an automatic mode.',
    Icon: Wand2,
  },
];

export default function Tools() {
  const { param } = useRoute();

  if (param === 'amprem') return <AmpremTool />;

  return (
    <PageShell title="Tools" subtitle="Handy things we build and use.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map(({ id, title, description, Icon }) => (
          <a
            key={id}
            href={`#/tools/${id}`}
            className="glass group rounded-2xl p-5 flex flex-col gap-2 transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon size={20} />
              </div>
              <ArrowUpRight
                size={18}
                className="opacity-60 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/75">{description}</p>
          </a>
        ))}
      </div>
    </PageShell>
  );
}