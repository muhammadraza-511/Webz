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
type Visit = { address: string; arrivedVia: string; visitedAt: string };

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
      setSite(null);
      return;
    }
    setAddress(currentAddress);
    request<Site>(`/sites/${encodeURIComponent(currentAddress)}`)
      .then(setSite)
      .catch(() => setSite(null));
  }, [currentAddress]);

  async function navigate(nextAddress: string, arrivedVia: string) {
    const normalized = nextAddress.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.zz$/.test(normalized)) {
      setError("Enter a valid .zz address.");
      return;
    }
    setError("");
    setMessage("");
    const nextStack = stack.slice(0, index + 1);
    nextStack.push(normalized);
    setStack(nextStack);
    setIndex(nextStack.length - 1);
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
    try {
      setResults(await request<SearchResult[]>(`/sites/search?q=${encodeURIComponent(search)}`));
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const author = useMemo(
    () => (typeof site?.authorId === "object" ? site.authorId.name : ""),
    [site],
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="font-mono text-sm uppercase tracking-widest text-slate-500">The Small Web</p>
          <h1 className="text-4xl font-bold">A browser for a tiny internet.</h1>
        </header>

        <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            <button disabled={!canGoBack} onClick={() => move(-1)} className="rounded bg-slate-200 px-3 py-2 disabled:opacity-40">Back</button>
            <button disabled={!canGoForward} onClick={() => move(1)} className="rounded bg-slate-200 px-3 py-2 disabled:opacity-40">Forward</button>
            <form onSubmit={submitAddress} className="flex min-w-[260px] flex-1 gap-2">
              <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="tidepool.zz" className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2" />
              <button className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Go</button>
            </form>
            <select value={personId} onChange={(event) => setPersonId(event.target.value)} className="rounded border border-slate-300 px-3 py-2">
              {people.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
            </select>
          </div>

          {error && <p className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
          {message && <p className="mb-4 rounded bg-green-50 p-3 text-green-700">{message}</p>}

          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <article className="min-h-[460px] rounded border border-slate-200 bg-slate-50 p-4">
              {site ? (
                <>
                  <h2 className="text-2xl font-semibold">{site.title}</h2>
                  <p className="mb-3 text-sm text-slate-500">{site.address}{author ? ` · by ${author}` : ""}</p>
                  <iframe title={site.title} srcDoc={frameDocument(site.html)} sandbox="allow-scripts" className="h-[380px] w-full rounded border border-slate-300 bg-white" />
                </>
              ) : currentAddress ? (
                <div className="flex h-full min-h-[380px] items-center justify-center text-center">
                  <div><h2 className="text-2xl font-semibold">Site not found</h2><p className="text-slate-500">There is no website at {currentAddress}.</p></div>
                </div>
              ) : <p className="text-slate-500">Enter an address to begin exploring.</p>}
            </article>

            <aside className="space-y-5">
              <form onSubmit={submitSearch} className="space-y-2">
                <h2 className="font-semibold">Search the web</h2>
                <div className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1" /><button className="rounded bg-slate-800 px-3 py-1 text-white">Search</button></div>
                {results.map((result) => <button type="button" key={result.address} onClick={() => void navigate(result.address, "search")} className="block w-full rounded border border-slate-200 p-2 text-left hover:bg-slate-50"><strong>{result.title}</strong><span className="block text-xs text-blue-700">{result.address}</span><span className="block text-xs text-slate-500">{result.snippet}</span></button>)}
              </form>
              <div>
                <h2 className="mb-2 font-semibold">History</h2>
                <div className="max-h-64 space-y-1 overflow-auto text-sm">{history.map((visit) => <button type="button" key={`${visit.visitedAt}-${visit.address}`} onClick={() => void navigate(visit.address, "history")} className="block w-full rounded px-2 py-1 text-left hover:bg-slate-100"><span className="font-medium">{visit.address}</span><span className="ml-2 text-xs text-slate-500">{visit.arrivedVia}</span></button>)}</div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
