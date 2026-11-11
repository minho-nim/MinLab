export type ArchiveRoute =
  | { view: 'archive' }
  | { view: 'home' | 'about' | 'admin' }
  | { view: 'project'; projectId: string }
  | { view: 'manage'; projectId: string }
  | { view: 'records'; projectId?: string; tab?: 'logs' | 'prompts'; editing?:boolean };

export function routeHash(route: ArchiveRoute): string {
  if (route.view === 'archive') return '#/';
  if (route.view === 'home' || route.view === 'about' || route.view === 'admin') return '#/' + route.view;
  if (route.view === 'project' || route.view === 'manage') {
    return '#/projects/' + encodeURIComponent(route.projectId) + (route.view === 'manage' ? '/manage' : '');
  }
  if (route.view !== 'records') return '#/home';
  const query = new URLSearchParams();
  if (route.projectId) query.set('project', route.projectId);
  if(route.editing) query.set('edit','1');
  if (route.tab === 'prompts') query.set('tab', 'prompts');
  return '#/development-log' + (query.size ? '?' + query.toString() : '');
}

export function parseRoute(hash: string): ArchiveRoute {
  const [path, query] = hash.replace(/^#/, '').split('?');
  if (path === '/home' || path === '/about' || path === '/admin') return { view: path.slice(1) as 'home' | 'about' | 'admin' };
  const match = /^\/projects\/([^/]+)(\/manage)?$/.exec(path);
  if (match) {
    try { return { view: match[2] ? 'manage' : 'project', projectId: decodeURIComponent(match[1]) }; }
    catch { return { view: 'archive' }; }
  }
  if (path === '/development-log') {
    const params = new URLSearchParams(query);
    return { view: 'records', ...(params.get('edit')==='1'?{editing:true}:{}), projectId: params.get('project') || undefined, tab: params.get('tab') === 'prompts' ? 'prompts' : 'logs' };
  }
  return { view: 'archive' };
}
