// Entries that always show on "Our story" (read-only). Edit them by hand.
export interface StoryDefault {
  id: string;
  title: string;
  description: string;
}

export const STORY_DEFAULTS: StoryDefault[] = [
  {
    id: 'story-start',
    title: 'Where it started',
    description:
      'Tell the beginning of Idzam here: what you build, why you build it and who it is for. Signed-in members can add their own photos, files and links below.',
  },
];
