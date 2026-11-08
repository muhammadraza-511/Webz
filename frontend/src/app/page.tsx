"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type Person = { _id: string; name: string };
type Site = {
  _id: string;
  address: string;
  title: string;
  html: string;
  authorId?: { name?: string } | string;
};
type SearchResult = { address: string; title: string; snippet: string };
type Visit = { address: string; siteId?: string | null; arrivedVia: string; visitedAt: string };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function frameDocument(html: string): string {
  const bridge = `
    <script>
      document.addEventListener("click", function (event) {
        const link = event.target.closest("a[href]");
        if (!link) return;
        const address = link.getAttribute("href");
        if (!address || !/^[a-z0-9]+(?:-[a-z0-9]+)*\\.zz$/i.test(address)) return;
        event.preventDefault();
        parent.postMessage({ type: "small-web-navigate", address: address.toLowerCase() }, "*");
      });
    </script>`;
  return `${html}${bridge}`;
}

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState("");
  const [address, setAddress] = useState("");
  const [stack, setStack] = useState<string[]>([]);
  const [index, setIndex] = useState(-1);
  const [site, setSite] = useState<Site | null>(null);
  const [history, setHistory] = useState<Visit[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [publishAddress, setPublishAddress] = useState("");
  const [publishTitle, setPublishTitle] = useState("");
  const [publishHtml, setPublishHtml] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingSite, setLoadingSite] = useState(false);
  const [searching, setSearching] = useState(false);

  const currentAddress = index >= 0 ? stack[index] : "";
  const canGoBack = index > 0;
  const canGoForward = index >= 0 && index < stack.length - 1;

  useEffect(() => {
    request<Person[]>("/people")
      .then((loaded) => {
        setPeople(loaded);
        if (loaded[0]) setPersonId(loaded[0]._id);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!personId) return;
    request<Visit[]>(`/visits/history/${personId}`)
      .then(setHistory)
      .catch((reason: Error) => setError(reason.message));
  }, [personId]);

  useEffect(() => {
    const receiveNavigation = (event: MessageEvent<{ type?: string; address?: string }>) => {
      if (event.data?.type === "small-web-navigate" && event.data.address) {
        void navigate(event.data.address, "link");
      }
    };
    window.addEventListener("message", receiveNavigation);
    return () => window.removeEventListener("message", receiveNavigation);
  });

  useEffect(() => {
    if (!currentAddress) {
      return;
    }
    request<Site>(`/sites/${encodeURIComponent(currentAddress)}`)
      .then(setSite)
      .catch(() => setSite(null))
      .finally(() => setLoadingSite(false));
  }, [currentAddress]);

  async function navigate(nextAddress: string, arrivedVia: string) {
    const normalized = nextAddress.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.zz$/.test(normalized)) {
      setError("Enter a valid .zz address.");
      return;
    }
    setError("");
    setMessage("");
    setLoadingSite(true);
    const nextStack = stack.slice(0, index + 1);
    nextStack.push(normalized);
    setStack(nextStack);
    setIndex(nextStack.length - 1);
    setAddress(normalized);
    if (personId) {
      try {
        await request("/visits", {
          method: "POST",
          body: JSON.stringify({ personId, address: normalized, arrivedVia }),
        });
        setHistory(await request<Visit[]>(`/visits/history/${personId}`));
      } catch (reason) {
        setError((reason as Error).message);
      }
    }
  }

  function submitAddress(event: FormEvent) {
    event.preventDefault();
    void navigate(address, "typed");
  }

  function move(delta: number) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= stack.length || !personId) return;
    setIndex(nextIndex);
    setAddress(stack[nextIndex]);
    void request("/visits", {
      method: "POST",
      body: JSON.stringify({
        personId,
        address: stack[nextIndex],
        arrivedVia: delta < 0 ? "back" : "forward",
      }),
    }).then(() => request<Visit[]>(`/visits/history/${personId}`)).then(setHistory);
  }

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      setResults(await request<SearchResult[]>(`/sites/search?q=${encodeURIComponent(search)}`));
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!personId) {
      setError("Select a publisher first.");
      return;
    }

    setPublishing(true);
    try {
      const addressName = publishAddress.trim().toLowerCase().replace(/\.zz$/i, "");
      const created = await request<Site>("/sites", {
        method: "POST",
        body: JSON.stringify({
          authorId: personId,
          address: `${addressName}.zz`,
          title: publishTitle,
          html: publishHtml,
        }),
      });
      setMessage(`Published ${created.address}.`);
      setError("");
      setPublishAddress("");
      setPublishTitle("");
      setPublishHtml("");
      setPublishOpen(false);
      await navigate(created.address, "typed");
    } catch (reason) {
      setError((reason as Error).message);
      setMessage("");
    } finally {
      setPublishing(false);
    }
  }

  const currentPerson = people.find((person) => person._id === personId);
  const initials = (currentPerson?.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const author = useMemo(
    () => (typeof site?.authorId === "object" ? site.authorId.name : ""),
    [site],
  );

  return (
    <main className="min-h-screen bg-[#f4f7f6] text-[#16212c]">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-7 lg:px-10">
        <header className="site-header">
          <div className="brand-lockup">
            <div className="brand-mark">W</div>
            <div>
              <p className="font-display text-xl font-bold tracking-tight">weblet</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#66727d]">the small web</p>
            </div>
          </div>
        </header>

        <section className="browser-shell">
          <div className="browser-chrome">
            <div className="flex items-center gap-1">
              <button aria-label="Go back" title="Go back" disabled={!canGoBack} onClick={() => move(-1)} className="icon-button">←</button>
              <button aria-label="Go forward" title="Go forward" disabled={!canGoForward} onClick={() => move(1)} className="icon-button">→</button>
            </div>
            <form onSubmit={submitAddress} className="address-bar">
              <span className="text-[#2f9160]">⌁</span>
              <input aria-label="Website address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Type a .zz address" />
              <button className="address-go">Go</button>
            </form>
            <div className="relative">
              <details className="user-menu">
                <summary className="user-summary">
                  <span className="avatar">{initials}</span>
                  <span className="hidden text-left sm:block"><span className="block text-[10px] uppercase tracking-wider text-[#7a8894]"></span><span className="block max-w-[90px] truncate text-sm font-semibold">{currentPerson?.name ?? "Select user"}</span></span>
                  <span className="user-caret" aria-hidden="true">▾</span>
                </summary>
                <div className="user-popover">
                  <p className="popover-label">Switch browser identity</p>
                  {people.map((person) => {
                    const personInitials = person.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
                    return <button type="button" key={person._id} onClick={(event) => { setPersonId(person._id); event.currentTarget.closest("details")?.removeAttribute("open"); }} className={`user-option ${person._id === personId ? "selected" : ""}`}><span className="avatar small">{personInitials}</span><span><strong>{person.name}</strong><small>{person._id === personId ? "Currently browsing" : "Browse as this person"}</small></span><span className="ml-auto">{person._id === personId ? "✓" : ""}</span></button>;
                  })}
                </div>
              </details>
            </div>
            <button onClick={() => setPublishOpen(true)} className="primary-button publish-header">Publish Website</button>
          </div>

          <div className="px-4 pt-4 sm:px-6">
            {error && <p role="alert" className="notice error">{error}</p>}
            {message && <p role="status" className="notice success">{message}</p>}
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <section className="viewport-card">
              <div className="viewport-toolbar">
                <div className="flex items-center gap-2"><span className="status-dot" /><span className="font-mono text-xs text-[#7a8894]">{currentAddress || "weblet://home"}</span></div>
                {site && <span className="text-xs text-[#7a8894]">{author ? `Published by ${author}` : "Small Web site"}</span>}
              </div>
              {loadingSite ? <div className="state-panel"><span className="loader" /><h2>Loading {currentAddress}...</h2><p>Finding that corner of the Small Web.</p></div> : site ? <iframe title={site.title} srcDoc={frameDocument(site.html)} sandbox="allow-scripts" className="h-[620px] w-full bg-white" /> : currentAddress ? <div className="state-panel"><span className="state-code">404</span><h2>This corner doesn’t exist</h2><p>The address <code>{currentAddress}</code> could not be found.</p><button disabled={!canGoBack} onClick={() => move(-1)} className="secondary-button mt-5">Go back</button></div> : <div className="state-panel home-state"><span className="home-spark">✦</span><p className="eyebrow">Welcome to weblet</p><h1>Explore the <em>Small Web.</em></h1><p>Discover thoughtful little corners, follow links, and publish something of your own.</p><button onClick={() => setPublishOpen(true)} className="primary-button mt-5">+ Publish your corner</button></div>}
            </section>

            <aside className="support-panels grid gap-4 lg:grid-cols-2">
              <section className="side-card">
                <div className="mb-3 flex items-center justify-between"><div><p className="eyebrow">Discover</p><h2 className="section-title">Search the Small Web</h2></div><span className="text-lg text-[#2e7bd6]">⌕</span></div>
                <form onSubmit={submitSearch} className="search-box"><input aria-label="Search websites" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pages and ideas" /><button aria-label="Search">{searching ? "…" : "→"}</button></form>
                {search && !searching && results.length === 0 && <p className="empty-copy">No sites matched that search.</p>}
                <div className="mt-3 space-y-2">{results.map((result) => <button type="button" key={result.address} onClick={() => void navigate(result.address, "search")} className="result-item"><span className="result-icon">↗</span><span className="min-w-0"><strong className="block truncate">{result.title}</strong><span className="block font-mono text-[11px] text-[#2e7bd6]">{result.address}</span><span className="mt-1 block line-clamp-2 text-xs text-[#7a8894]">{result.snippet}</span></span></button>)}</div>
              </section>
              <section className="side-card">
                <div className="mb-3 flex items-end justify-between"><div><p className="eyebrow">Your trail</p><h2 className="section-title">Recent visits</h2></div><span className="text-xs text-[#7a8894]">{history.length} visits</span></div>
                <div className="history-list">{history.length ? history.map((visit) => <button type="button" key={`${visit.visitedAt}-${visit.address}`} onClick={() => void navigate(visit.address, "history")} className={`history-item ${visit.address === currentAddress ? "current" : ""}`}><span className="history-icon">{visit.siteId ? "◌" : "!"}</span><span className="min-w-0"><strong className="block truncate">{visit.address}</strong><span className="block text-xs text-[#7a8894]">{visit.arrivedVia} · {new Date(visit.visitedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></span></button>) : <p className="empty-copy">Your visited sites will appear here.</p>}</div>
              </section>
            </aside>
          </div>
        </section>
        <footer className="mt-5 flex justify-between px-1 font-mono text-[10px] uppercase tracking-widest text-[#9aa5ac]"><span>Made for curious minds</span><span>10 sites · 4 explorers</span></footer>
      </div>
      {publishOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPublishOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="publish-title" className="publish-modal"><div className="mb-6 flex items-start justify-between"><div><span className="modal-spark">✦</span><p className="eyebrow mt-3">Create something new</p><h2 id="publish-title" className="mt-1 text-2xl font-bold tracking-tight">Publish your corner<br />of the Small Web.</h2><p className="mt-2 text-sm text-[#7a8894]">A little space for your ideas, stories, or experiments.</p></div><button aria-label="Close publish dialog" onClick={() => setPublishOpen(false)} className="icon-button">×</button></div><form onSubmit={publish} className="space-y-4"><label className="field-label">Website address<div className="input-with-suffix"><input required value={publishAddress} onChange={(event) => setPublishAddress(event.target.value)} placeholder="my-little-site" /><span>.zz</span></div></label><label className="field-label">Website title<input required value={publishTitle} onChange={(event) => setPublishTitle(event.target.value)} placeholder="A thoughtful title" /></label><label className="field-label">Website content<span className="ml-2 font-normal normal-case tracking-normal text-[#9aa5ac]">HTML supported</span><textarea required value={publishHtml} onChange={(event) => setPublishHtml(event.target.value)} placeholder={"<h1>Hello, Small Web!</h1>\n\n<p>Welcome to my website.</p>"} rows={7} /></label><div className="flex justify-end gap-2 border-t border-[#e3e8e6] pt-4"><button type="button" onClick={() => setPublishOpen(false)} className="secondary-button">Cancel</button><button disabled={publishing} className="primary-button">{publishing ? "Publishing..." : "Publish website →"}</button></div></form></section></div>}
    </main>
  );
}
