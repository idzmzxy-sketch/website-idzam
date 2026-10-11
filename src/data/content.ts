export type ItemKind = 'note' | 'image' | 'file' | 'link';

export interface ContentItem {
  id: string;
  kind: ItemKind;
  title: string;
  description: string;
  /** link: https URL. image/file: data URL (or an https URL you paste in by hand). */
  url?: string;
  fileName?: string;
  fileSize?: number;
}

// Default entries shown until something is added on that page.
// You can edit these by hand, e.g. paste an https image URL into `url`.
export const STORY_DEFAULTS: ContentItem[] = [
  {
    id: 'story-start',
    kind: 'note',
    title: 'Where it started',
    description:
      'Tell the beginning of Idzam here: what you build, why you build it and who it is for. Use the Add button to put in your own text, photos, files or links.',
  },
];

export const WORK_DEFAULTS: ContentItem[] = [
  {
    id: 'work-first',
    kind: 'note',
    title: 'Your first project',
    description:
      'Add a screenshot, a link to a live site or a file for each project you want to show here.',
  },
];
