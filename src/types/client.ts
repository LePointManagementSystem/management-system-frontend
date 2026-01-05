export interface Guest {
  id?: string;
  firstName: string;
  lastName: string;
  cin: string;
  email?: string;
}

// Legacy / UI helper type used by some components (e.g. client-search mock).
// You can remove this when the UI is fully wired to the real Guest endpoints.
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  cin: string;
}