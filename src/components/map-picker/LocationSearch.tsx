import { useState } from "react";

type Props = {
  onSelect: (lat: number, lng: number, displayName: string) => void;
};

// Nominatim is OSM's geocoding tool
type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

export const LocationSearchBar = ({ onSelect }: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        limit: "5",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { "User-Agent": "TactileMapGenerator/1.0" } },
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search for an address or intersection..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="bg-white border border-gray-200 rounded shadow-sm max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                onClick={() => {
                  onSelect(
                    parseFloat(r.lat),
                    parseFloat(r.lon),
                    r.display_name,
                  );
                  setResults([]);
                  setQuery(r.display_name);
                }}
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
