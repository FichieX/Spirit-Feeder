export const API_URL = 'http://172.20.10.2:3000';

export type User = { 
  id: number; 
  username: string; 
  email: string; 
  birthday: string;
  xp?: number;
  animal_level?: number;
  hunger?: number;
  is_dead?: boolean;
  current_section_id?: number;
  pet?: { stage: string; name: string } | null;
};

async function post(path: string, body: object) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : null;
    throw new Error(detail ?? 'Something went wrong. Try again.');
  }
  return data;
}

// --- AUTHENTICATION ---

export async function login(identifier: string, password: string): Promise<User> {
  const data = await post('/api/login', { identifier, password });
  return data.user;
}

export async function register(input: {
  username: string;
  email: string;
  password: string;
  birthday: string;
}): Promise<User> {
  const data = await post('/api/register', input);
  return { id: data.user_id, username: input.username, email: input.email, birthday: input.birthday };
}

// --- PET SELECTION ---

export async function getAnimals() {
  const res = await fetch(`${API_URL}/api/animals`).catch(() => null);
  if (!res || !res.ok) throw new Error('Failed to load animals.');
  return res.json();
}

export async function selectPet(userId: number, animalId: number) {
  return await post('/api/pet/select', { user_id: userId, animal_id: animalId });
}

// --- GAME MECHANICS ---

export async function fetchPetStatus(userId: number) {
  const res = await fetch(`${API_URL}/api/pet/status/${userId}`).catch(() => null);
  if (!res) throw new Error("Can't reach the server.");
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch pet status.');
  return data;
}

export async function fetchNextReading(userId: number) {
  const res = await fetch(`${API_URL}/api/reading/next/${userId}`).catch(() => null);
  if (!res) throw new Error("Can't reach the server.");
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to load scripture passage.');
  return data;
}

export async function feedPet(userId: number) {
  return await post('/api/pet/feed', { user_id: userId });
}