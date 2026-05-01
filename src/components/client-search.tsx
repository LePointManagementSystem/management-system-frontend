import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Guest } from '@/types/client';
import { fetchGuests } from '@/services/client-service';

interface ClientSearchProps {
  onClientSelect: (client: Guest) => void;
}

const ClientSearch: React.FC<ClientSearchProps> = ({ onClientSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const all = await fetchGuests();
      const needle = query.toLowerCase();
      const filtered = all.filter((g) =>
        (g.firstName || '').toLowerCase().includes(needle) ||
        (g.lastName || '').toLowerCase().includes(needle) ||
        (`${g.firstName} ${g.lastName}`).toLowerCase().includes(needle) ||
        (g.email || '').toLowerCase().includes(needle) ||
        (g.cin || '').toLowerCase().includes(needle)
      );
      setSearchResults(filtered);
    } catch (e: any) {
      setError(e?.message ?? 'Search failed');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Search by name, email or CIN…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Search
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {searchResults.length > 0 && (
        <ul className="space-y-2">
          {searchResults.map((guest) => (
            <li
              key={guest.id}
              className="flex justify-between items-center p-2 bg-gray-100 rounded"
            >
              <span>
                {guest.firstName} {guest.lastName}
                {guest.email ? ` (${guest.email})` : ''}
                {guest.cin ? ` • CIN: ${guest.cin}` : ''}
              </span>
              <Button size="sm" onClick={() => onClientSelect(guest)}>
                Select
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!loading && searchQuery && searchResults.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">No results found.</p>
      )}
    </div>
  );
};

export default ClientSearch;
