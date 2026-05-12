
/**
 * Utility to get or create a persistent unique identifier for the user
 * stored in localStorage. This replaces Firebase Auth UID for unauthenticated environments.
 */
export function getLocalUserId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let id = localStorage.getItem('watchparty_uid');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('watchparty_uid', id);
  }
  return id;
}
