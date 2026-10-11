import ContentBoard from '../components/ContentBoard';
import { STORY_DEFAULTS } from '../data/content';

export default function Story() {
  return (
    <ContentBoard
      storageKey="story"
      title="Our story"
      subtitle="Who is behind Idzam, and how it all began."
      defaults={STORY_DEFAULTS}
    />
  );
}
