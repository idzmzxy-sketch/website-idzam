import { useState, type FormEvent } from 'react';
import { useBackgrounds } from '../backgrounds';
import { inputClass } from '../styles';

export default function UploadForm({ onDone }: { onDone: () => void }) {
  const { addLink } = useBackgrounds();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    const err = await addLink({ title, description, url: link });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onDone();
  };

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4 w-full max-w-2xl"
    >
      <h2 className="text-xl font-semibold text-white tracking-tight">Share a background</h2>

      <input
        type="text"
        placeholder="Title"
        aria-label="Title"
        maxLength={80}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={`w-full ${inputClass}`}
      />
      <textarea
        rows={2}
        placeholder="Description (optional)"
        aria-label="Description"
        maxLength={300}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={`w-full resize-none ${inputClass}`}
      />

      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          inputMode="url"
          placeholder="https://example.com/background.mp4"
          aria-label="Link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className={`w-full ${inputClass}`}
        />
        <p className="text-xs text-white/60">
          A direct https link to an .mp4 video or an image (not a YouTube page). Files cannot be uploaded here.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full text-sm font-semibold py-3 rounded-2xl disabled:opacity-60"
      >
        {busy ? 'Saving...' : 'Add background'}
      </button>
    </form>
  );
}
