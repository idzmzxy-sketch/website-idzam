import { Wrench } from 'lucide-react';
import PageShell from '../components/PageShell';
import { glassPanelClass } from '../styles';

export default function Tools() {
  return (
    <PageShell title="Tools" subtitle="Handy things we build and use.">
      <div className={`${glassPanelClass} p-8 sm:p-12 flex flex-col items-center text-center gap-3 max-w-xl`}>
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white">
          <Wrench size={20} />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Coming soon</h2>
        <p className="text-sm text-white/80">Tools are on the way. Check back soon.</p>
      </div>
    </PageShell>
  );
}
