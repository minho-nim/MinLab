export type ArchiveRoute =
  | { view: 'archive' }
  | { view: 'project'; projectId: string }
  | { view: 'manage'; projectId: string }
  | { view: 'records'; projectId?: string; tab?: 'logs' | 'prompts' };

export function routeHash(route: ArchiveRoute): string {
  if (route.view === 'archive') return '#/';
  if (route.view === 'project' || route.view === 'manage') {
    return '#/projects/' + encodeURIComponent(route.projectId) + (route.view === 'manage' ? '/manage' : '');
  }
  const query = new URLSearchParams();
  if (route.projectId) query.set('project', route.projectId);
  if (route.tab === 'prompts') query.set('tab', 'prompts');
  return '#/development-log' + (query.size ? '?' + query.toString() : '');
}

export function parseRoute(hash: string): ArchiveRoute {
  const [path, query] = hash.replace(/^#/, '').split('?');
  const match = /^\/projects\/([^/]+)(\/manage)?$/.exec(path);
  if (match) {
    try { return { view: match[2] ? 'manage' : 'project', projectId: decodeURIComponent(match[1]) }; }
    catch { return { view: 'archive' }; }
  }
  if (path === '/development-log') {
    const params = new URLSearchParams(query);
    return { view: 'records', projectId: params.get('project') || undefined, tab: params.get('tab') === 'prompts' ? 'prompts' : 'logs' };
  }
  return { view: 'archive' };
}
