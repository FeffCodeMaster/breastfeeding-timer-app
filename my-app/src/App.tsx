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
const INTERVAL_STORAGE_KEY = 'breastfeeding-interval-hours';
const D_VITAMIN_STORAGE_KEY = 'breastfeeding-dvitamin-days';

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

const loadIntervalHours = () => {
  const raw = localStorage.getItem(INTERVAL_STORAGE_KEY);
  const parsed = raw ? parseInt(raw, 10) : 3;
  return [1, 2, 3, 4].includes(parsed) ? parsed : 3;
};

const loadDVitaminMap = () => {
  const raw = localStorage.getItem(D_VITAMIN_STORAGE_KEY);
  if (!raw) return {} as Record<string, boolean>;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed).filter(
        ([key, value]) => typeof key === 'string' && typeof value === 'boolean'
      );
      return Object.fromEntries(entries) as Record<string, boolean>;
    }
    return {};
  } catch {
    return {};
  }
};

const calculateAverageMinutes = (list: TimestampEntry[]) => {
  if (list.length < 2) return null;

  const sorted = [...list].sort(
    (a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime()
  );

  let total = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    total += (new Date(sorted[i].iso).getTime() - new Date(sorted[i - 1].iso).getTime()) / 60000;
  }

  return total / (sorted.length - 1);
};

const formatInterval = (minutes: number | null) => {
  if (minutes === null) return '—';
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes - hours * 60);
  if (hours <= 0) return `${remaining}m`;
  return `${hours}h ${remaining}m`;
};

function App() {
  const [entries, setEntries] = useState<TimestampEntry[]>(() => loadStoredEntries());
  const [intervalHours, setIntervalHours] = useState<number>(() => loadIntervalHours());
  const [dVitaminMap, setDVitaminMap] = useState<Record<string, boolean>>(() => loadDVitaminMap());
  const todayKey = useMemo(() => toDateKey(new Date().toISOString()), []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(INTERVAL_STORAGE_KEY, String(intervalHours));
  }, [intervalHours]);

  useEffect(() => {
    localStorage.setItem(D_VITAMIN_STORAGE_KEY, JSON.stringify(dVitaminMap));
  }, [dVitaminMap]);

  const latestEntry = useMemo(() => {
    if (!entries.length) return null;
    return entries.reduce((latest, current) =>
      new Date(current.iso).getTime() > new Date(latest.iso).getTime() ? current : latest
    );
  }, [entries]);

  const nextFeedingIso = useMemo(() => {
    if (!latestEntry) return null;
    const next = new Date(latestEntry.iso);
    next.setHours(next.getHours() + intervalHours);
    return next.toISOString();
  }, [latestEntry, intervalHours]);

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

  const averageAllMinutes = useMemo(() => calculateAverageMinutes(entries), [entries]);

  const averageTodayMinutes = useMemo(
    () => calculateAverageMinutes(entries.filter((entry) => toDateKey(entry.iso) === todayKey)),
    [entries, todayKey]
  );

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

  const toggleDVitaminForDay = (dayKey: string) => {
    setDVitaminMap((prev) => ({
      ...prev,
      [dayKey]: !prev[dayKey],
    }));
  };

  const hasEntries = entries.length > 0;

  return (
    <div className="app">
      <main className="panel">
        <header className="panel__header">
          <div>
            <p className="eyebrow">Breastfeeding App</p>
            <h1>🤱 Feeding Logger </h1>
          </div>
        </header>

        <section className="actions">
          <div className="actions__summary">
            <span className="dot" aria-hidden="true" />
            <span>{hasEntries ? `${entries.length} saved` : 'No timestamps yet'}</span>
          </div>
          <div className="actions__buttons">
            <button className="primary" onClick={handleAdd}>
              Log new feeding
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

        <section className="next">
          <div>
            <p className="eyebrow">Next feeding before</p>
            {nextFeedingIso ? (
              <>
                <h2>{formatTimeLabel(nextFeedingIso)}</h2>
                <p className="lede">
                  Based on your last log at {formatTimeLabel(latestEntry!.iso)} and a {intervalHours}h interval.
                </p>
              </>
            ) : (
              <>
                <h2>Log a feeding to start the timer</h2>
                <p className="lede">Choose an interval and tap “Log now” when you feed.</p>
              </>
            )}
          </div>
          <div className="chips" role="group" aria-label="Next feeding interval">
            {[1, 2, 3, 4].map((hours) => (
              <button
                key={hours}
                className={`chip ${intervalHours === hours ? 'chip--active' : ''}`}
                onClick={() => setIntervalHours(hours)}
              >
                {hours}h
              </button>
            ))}
          </div>
        </section>

        <section className="averages" aria-label="Average intervals">
          <div className="average-card">
            <p className="eyebrow">All time average</p>
            <h3>{formatInterval(averageAllMinutes)}</h3>
            <p className="lede lede--small">Typical gap across every logged feeding.</p>
          </div>
          <div className="average-card">
            <p className="eyebrow">Today average</p>
            <h3>{formatInterval(averageTodayMinutes)}</h3>
            <p className="lede lede--small">Based only on entries from today.</p>
          </div>
        </section>

        {hasEntries ? (
          <div className="groups" role="list">
            {grouped.map((group) => (
              <div key={group.key} className="group" role="listitem">
                <div className="group__heading">
                  <div className="group__title">{group.label}</div>
                  <div className="group__meta">
                    <label className="dvitamin">
                      <input
                        type="checkbox"
                        checked={Boolean(dVitaminMap[group.key])}
                        onChange={() => toggleDVitaminForDay(group.key)}
                        aria-label={`D-vitamin given on ${group.label}`}
                      />
                      <span>D-vitamin</span>
                    </label>
                    <div className="group__average" aria-label={`Average interval for ${group.label}`}>
                      <p className="group__average-label">Average gap</p>
                      <p className="group__average-value">
                        {formatInterval(calculateAverageMinutes(group.entries))}
                      </p>
                    </div>
                  </div>
                </div>
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
