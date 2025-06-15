import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Client } from '@/types/client';



// Mock function to simulate database search
const searchClients = async (query: string): Promise<Client[]> => {
  // In a real application, this would be an API call to your backend
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  const mockClients: Client[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', phone: '123-456-7890', cin: '1238748937'},
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321', cin: '12389878937' },
  ];
  return mockClients.filter(client => 
    client.name.toLowerCase().includes(query.toLowerCase()) ||
    client.email.toLowerCase().includes(query.toLowerCase())
  );
};

interface ClientSearchProps {
  onClientSelect: (client: Client) => void;
}

const ClientSearch: React.FC<ClientSearchProps> = ({ onClientSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);

  const handleSearch = async () => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    const results = await searchClients(searchQuery);
    setSearchResults(results);
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button onClick={handleSearch}>
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>

      {searchResults.length > 0 && (
        <ul className="space-y-2">
          {searchResults.map((client) => (
            <li key={client.id} className="flex justify-between items-center p-2 bg-gray-100 rounded">
              <span>{client.name} ({client.email})</span>
              <Button onClick={() => onClientSelect(client)}>Select</Button>
            </li>
          ))}
        </ul>
      )}

      {searchQuery && searchResults.length === 0 && <p>No results found.</p>}
    </div>
  );
};

export default ClientSearch;

