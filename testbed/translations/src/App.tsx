import { useState, useMemo, useRef, useEffect } from "react";
import { lookup, allKeys } from "./translate";

export function App() {
  const [input, setInput] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const keys = useMemo(() => allKeys(), []);

  const filtered = useMemo(() => {
    if (!input) return keys.slice(0, 20);
    const lower = input.toLowerCase();
    return keys.filter((k) => k.toLowerCase().includes(lower)).slice(0, 20);
  }, [input, keys]);

  const value = useMemo(() => (input ? lookup(input) : undefined), [input]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const pickSuggestion = (key: string) => {
    setInput(key);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pickSuggestion(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Translation Lookup</h1>
          <p className="text-sm text-zinc-400">
            Type a dot-separated key to see its value
          </p>
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. nav.links.home"
            spellCheck={false}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm
                       font-mono text-zinc-100 placeholder-zinc-500
                       outline-none ring-offset-zinc-950
                       focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
                       transition-all"
          />

          {isOpen && filtered.length > 0 && (
            <ul
              ref={listRef}
              className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg
                         border border-zinc-700 bg-zinc-900 py-1 text-sm font-mono shadow-xl"
            >
              {filtered.map((key, i) => (
                <li
                  key={key}
                  onMouseDown={() => pickSuggestion(key)}
                  className={`cursor-pointer px-4 py-2 transition-colors ${
                    i === selectedIndex
                      ? "bg-indigo-600/30 text-indigo-300"
                      : "text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {key}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className={`rounded-lg border px-5 py-4 transition-all ${
            value !== undefined
              ? "border-emerald-700/50 bg-emerald-950/30"
              : input
                ? "border-red-700/50 bg-red-950/20"
                : "border-zinc-800 bg-zinc-900/50"
          }`}
        >
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
            Result
          </div>
          <div className="text-lg">
            {!input && <span className="text-zinc-600 italic">Start typing a key…</span>}
            {input && value !== undefined && (
              <span className="text-emerald-300">{value}</span>
            )}
            {input && value === undefined && (
              <span className="text-red-400">No match</span>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-zinc-600">
          {keys.length} translation keys available
        </div>
      </div>
    </div>
  );
}
