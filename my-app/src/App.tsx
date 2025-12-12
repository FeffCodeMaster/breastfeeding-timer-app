import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

type TimestampEntry = {
  id: string;
  iso: string;
};

type GroupedEntries = {
  key: string;
  label: string;
  entries: TimestampEntry[];
};

const STORAGE_KEY = 'breastfeeding-timestamps';

const createId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `ts-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toDateKey = (iso: string) => {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatTimeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const loadStoredEntries = (): TimestampEntry[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) =>
        item && typeof item.id === 'string' && typeof item.iso === 'string'
          ? { id: item.id, iso: item.iso }
          : null
      )
      .filter((item): item is TimestampEntry => Boolean(item));
  } catch {
    return [];
  }
};

function App() {
  const [entries, setEntries] = useState<TimestampEntry[]>(() => loadStoredEntries());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const grouped = useMemo<GroupedEntries[]>(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime()
    );
    const map = new Map<string, TimestampEntry[]>();

    sorted.forEach((entry) => {
      const key = toDateKey(entry.iso);
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(entry);
      } else {
        map.set(key, [entry]);
      }
    });

    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: formatDateLabel(items[0].iso),
      entries: items,
    }));
  }, [entries]);

  const handleAdd = () => {
    const now = new Date().toISOString();
    setEntries((prev) => [{ id: createId(), iso: now }, ...prev]);
  };

  const handleRemove = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleClear = () => {
    setEntries([]);
  };

  const hasEntries = entries.length > 0;

  return (
    <div className="app">
      <main className="panel">
        <header className="panel__header">
          <div>
            <p className="eyebrow">IB's Breastfeeding App</p>
            <h1>🤱 Feeding Timer </h1>
          </div>
        </header>

        <section className="actions">
          <div className="actions__summary">
            <span className="dot" aria-hidden="true" />
            <span>{hasEntries ? `${entries.length} saved` : 'No timestamps yet'}</span>
          </div>
          <div className="actions__buttons">
            <button className="primary" onClick={handleAdd}>
              Log now
            </button>
            <div className="menu">
              <details>
                <summary aria-label="More actions" title="More actions">
                  <span className="menu__dots" aria-hidden="true">···</span>
                </summary>
                <div className="menu__sheet">
                  <button className="ghost" onClick={handleClear} disabled={!hasEntries}>
                    Clear list
                  </button>
                </div>
              </details>
            </div>
          </div>
        </section>

        {hasEntries ? (
          <div className="groups" role="list">
            {grouped.map((group) => (
              <div key={group.key} className="group" role="listitem">
                <div className="group__title">{group.label}</div>
                <ul className="times">
                  {group.entries.map((entry) => (
                    <li key={entry.id} className="times__item">
                      <span className="time">{formatTimeLabel(entry.iso)}</span>
                      <button
                        className="icon-button"
                        onClick={() => handleRemove(entry.id)}
                        aria-label={`Remove timestamp at ${formatTimeLabel(entry.iso)}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__bubble">Tap "Log now" to add your first timestamp.</div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
