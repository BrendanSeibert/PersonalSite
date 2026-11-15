export type Health = { status: string; db: string };

export async function fetchHealth(): Promise<Health> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return (await res.json()) as Health;
}
