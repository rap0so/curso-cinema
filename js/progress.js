const STORAGE_KEY = 'cine-course.progress.v1';
const PROGRESS_URL = 'progress.json';

export const storage = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

async function fetchProgressFile() {
  try {
    const response = await fetch(PROGRESS_URL, { cache: 'no-store' });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function writeProgressFile(value) {
  fetch(PROGRESS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  }).catch(() => {});
}

const savedProgress = await fetchProgressFile();

export const progress = { achievements: [], resets: 0, takes: 0, ...(savedProgress ?? storage.read(STORAGE_KEY, {})) };

export function saveProgress() {
  storage.write(STORAGE_KEY, progress);
  writeProgressFile(progress);
}

// First run with the file-backed server: migrate what was only in localStorage.
if (!savedProgress) saveProgress();

export function announceProgress() {
  saveProgress();
  document.dispatchEvent(new Event('course:progress'));
}
