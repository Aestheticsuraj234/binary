import {redirect} from 'next/navigation';

/** The crew now lives on Discover and in the sidebar; keep old links working. */
export default function AgentsPage() {
  redirect('/');
}
