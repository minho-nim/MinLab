import snapshot from './archiveSnapshot.json';
import type { Project } from '../types';

// The user-provided archive backup is the public baseline. Browser edits remain local.
export const INITIAL_PROJECTS: Project[] = snapshot as Project[];