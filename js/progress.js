const STORAGE_KEY = 'cine-course.progress.v1';

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

export const progress = { achievements: [], resets: 0, takes: 0, ...storage.read(STORAGE_KEY, {}) };

export const saveProgress = () => storage.write(STORAGE_KEY, progress);

export function announceProgress() {
  saveProgress();
  document.dispatchEvent(new Event('course:progress'));
}
