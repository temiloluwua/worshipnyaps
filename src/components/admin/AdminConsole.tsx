import React, { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, FileText, UserCheck, Check, X, Loader2, ArrowLeft, AlertTriangle, UserCog, Ban } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface AdminConsoleProps {
  onClose: () => void;
}

type ConsoleTab = 'reports' | 'topics' | 'moderators';

interface ReportRow {
  id: string;
  report_type: string;
  category: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_topic_id: string | null;
  reported_community_post_id: string | null;
  content_snapshot: Record<string, unknown> | null;
}

interface TopicRequestRow {
  id: string;
  title: string;
  description: string | null;
  bible_verse: string | null;
  status: string;
  requested_by: string;
  created_at: string;
}

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'host' | 'moderator' | 'admin';
  banned_at?: string | null;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onClose }) => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<ConsoleTab>('reports');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [topicRequests, setTopicRequests] = useState<TopicRequestRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .in('status', ['pending', 'investigating'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setReports((data || []) as ReportRow[]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTopicRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('topic_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setTopicRequests((data || []) as TopicRequestRow[]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load topic requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('role', ['moderator', 'admin'])
        .order('role', { ascending: true });
      if (error) throw error;
      setStaff((data || []) as StaffRow[]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'reports') loadReports();
    if (tab === 'topics') loadTopicRequests();
    if (tab === 'moderators') loadStaff();
  }, [tab, loadReports, loadTopicRequests, loadStaff]);

  // Live search for promoting users (admin only)
  useEffect(() => {
    if (tab !== 'moderators' || !isAdmin || !search.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, email, role, banned_at')
        .or(`name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,username.ilike.%${search.trim()}%`)
        .limit(8);
      setSearchResults((data || []) as StaffRow[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tab, isAdmin]);

  const resolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    setActingId(id);
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status, resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success(status === 'resolved' ? 'Marked resolved' : 'Dismissed');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update report');
    } finally {
      setActingId(null);
    }
  };

  // The post referenced by a report, if any (reported topics + community posts
  // are auto-hidden on report and stay hidden until a moderator acts here).
  const contentRef = (r: ReportRow): { kind: 'topic' | 'community_post'; id: string } | null => {
    if (r.reported_topic_id) return { kind: 'topic', id: r.reported_topic_id };
    if (r.reported_community_post_id) return { kind: 'community_post', id: r.reported_community_post_id };
    return null;
  };

  // Approve = the post is fine: unhide it and close the report.
  const restoreContent = async (r: ReportRow) => {
    const ref = contentRef(r);
    if (!ref) return;
    setActingId(r.id);
    try {
      const { error } = await supabase.rpc('moderator_set_content_hidden', { p_kind: ref.kind, p_id: ref.id, p_hidden: false });
      if (error) throw error;
      await supabase.from('reports').update({ status: 'dismissed', resolved_at: new Date().toISOString() }).eq('id', r.id);
      setReports(prev => prev.filter(x => x.id !== r.id));
      toast.success('Post restored');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to restore');
    } finally {
      setActingId(null);
    }
  };

  // Ban the reported user (ejects them: server-side triggers block all their
  // future posts and the app shows them a suspended screen) and resolve.
  const banReportedUser = async (r: ReportRow) => {
    if (!r.reported_user_id) return;
    const reason = window.prompt('Reason for suspending this user? (optional)', r.description || '');
    if (reason === null) return; // cancelled
    setActingId(r.id);
    try {
      const { error } = await supabase.rpc('admin_ban_user', { p_user_id: r.reported_user_id, p_reason: reason || null });
      if (error) throw error;
      await supabase.from('reports').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', r.id);
      setReports(prev => prev.filter(x => x.id !== r.id));
      toast.success('User suspended');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to suspend user');
    } finally {
      setActingId(null);
    }
  };

  // Ban/unban from the moderator search (admin).
  const setUserBanned = async (userId: string, banned: boolean) => {
    let reason: string | null = null;
    if (banned) {
      const input = window.prompt('Reason for suspending this user? (optional)', '');
      if (input === null) return; // cancelled
      reason = input || null;
    }
    setActingId(userId);
    try {
      const { error } = banned
        ? await supabase.rpc('admin_ban_user', { p_user_id: userId, p_reason: reason })
        : await supabase.rpc('admin_unban_user', { p_user_id: userId });
      if (error) throw error;
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, banned_at: banned ? new Date().toISOString() : null } : u));
      toast.success(banned ? 'User suspended' : 'User reinstated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user');
    } finally {
      setActingId(null);
    }
  };

  // Remove = delete the post and close the report.
  const removeContent = async (r: ReportRow) => {
    const ref = contentRef(r);
    if (!ref) return;
    if (!window.confirm('Delete this post permanently?')) return;
    setActingId(r.id);
    try {
      const { error } = await supabase.rpc('moderator_delete_content', { p_kind: ref.kind, p_id: ref.id });
      if (error) throw error;
      await supabase.from('reports').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', r.id);
      setReports(prev => prev.filter(x => x.id !== r.id));
      toast.success('Post removed');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove');
    } finally {
      setActingId(null);
    }
  };

  const decideTopicRequest = async (id: string, status: 'approved' | 'rejected') => {
    setActingId(id);
    try {
      const { error } = await supabase
        .from('topic_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      setTopicRequests(prev => prev.filter(t => t.id !== id));
      toast.success(status === 'approved' ? 'Approved' : 'Rejected');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update request');
    } finally {
      setActingId(null);
    }
  };

  const setUserRole = async (userId: string, newRole: 'member' | 'moderator' | 'admin') => {
    setActingId(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      toast.success(`Role set to ${newRole}`);
      await loadStaff();
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as StaffRow['role'] } : u));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update role');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Admin Console
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Signed in as {profile?.name} · {profile?.role}
            </p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2">
          <TabBtn current={tab} value="reports" label="Reports" icon={<AlertTriangle className="w-3.5 h-3.5" />} onClick={setTab} />
          <TabBtn current={tab} value="topics" label="Topic requests" icon={<FileText className="w-3.5 h-3.5" />} onClick={setTab} />
          {isAdmin && (
            <TabBtn current={tab} value="moderators" label="Moderators" icon={<UserCog className="w-3.5 h-3.5" />} onClick={setTab} />
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : tab === 'reports' ? (
          reports.length === 0 ? (
            <EmptyState icon={<UserCheck className="w-8 h-8" />} title="No open reports" body="Everything is clean. Reports show up here when users flag content." />
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                          {r.report_type}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{r.category}</span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{r.description}</p>
                      {r.content_snapshot && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic line-clamp-3">
                          Reported content: {JSON.stringify(r.content_snapshot).slice(0, 200)}
                        </p>
                      )}
                    </div>
                  </div>
                  {contentRef(r) && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">
                      This post is hidden from the feed until you approve or remove it.
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {contentRef(r) ? (
                      <>
                        <button
                          onClick={() => restoreContent(r)}
                          disabled={actingId === r.id}
                          className="flex-1 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve (restore)
                        </button>
                        <button
                          onClick={() => removeContent(r)}
                          disabled={actingId === r.id}
                          className="flex-1 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Remove post
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => resolveReport(r.id, 'resolved')}
                          disabled={actingId === r.id}
                          className="flex-1 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Resolve
                        </button>
                        <button
                          onClick={() => resolveReport(r.id, 'dismissed')}
                          disabled={actingId === r.id}
                          className="flex-1 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Dismiss
                        </button>
                      </>
                    )}
                  </div>
                  {r.reported_user_id && (
                    <button
                      onClick={() => banReportedUser(r)}
                      disabled={actingId === r.id}
                      className="mt-2 w-full py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-xs font-semibold rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" /> Suspend this user
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        ) : tab === 'topics' ? (
          topicRequests.length === 0 ? (
            <EmptyState icon={<FileText className="w-8 h-8" />} title="No pending topic requests" body="Submissions from members show up here for you to approve." />
          ) : (
            <div className="space-y-3">
              {topicRequests.map(t => (
                <div key={t.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t.title}</h3>
                  {t.bible_verse && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{t.bible_verse}</p>
                  )}
                  {t.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{t.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => decideTopicRequest(t.id, 'approved')}
                      disabled={actingId === t.id}
                      className="flex-1 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => decideTopicRequest(t.id, 'rejected')}
                      disabled={actingId === t.id}
                      className="flex-1 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'moderators' && isAdmin ? (
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or username to promote..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                  {searchResults.map(u => (
                    <div key={u.id} className="flex items-center gap-2 p-2 rounded hover:bg-white dark:hover:bg-gray-700">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                          {u.name}
                          {u.banned_at && (
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Suspended</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email} · {u.role}</p>
                      </div>
                      <select
                        value={u.role}
                        onChange={(e) => setUserRole(u.id, e.target.value as 'member' | 'moderator' | 'admin')}
                        disabled={actingId === u.id}
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 px-2 py-1"
                      >
                        <option value="member">member</option>
                        <option value="moderator">moderator</option>
                        <option value="admin">admin</option>
                      </select>
                      {u.role === 'member' && (
                        u.banned_at ? (
                          <button
                            onClick={() => setUserBanned(u.id, false)}
                            disabled={actingId === u.id}
                            className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => setUserBanned(u.id, true)}
                            disabled={actingId === u.id}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            Ban
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Current staff</h3>
            {staff.length === 0 ? (
              <EmptyState icon={<UserCog className="w-8 h-8" />} title="No moderators yet" body="Use the search above to promote a trusted member." />
            ) : (
              <div className="space-y-2">
                {staff.map(u => (
                  <div key={u.id} className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                      {u.role}
                    </span>
                    {u.id !== profile?.id && (
                      <button
                        onClick={() => setUserRole(u.id, 'member')}
                        disabled={actingId === u.id}
                        className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                        title="Demote to member"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const TabBtn: React.FC<{
  current: ConsoleTab;
  value: ConsoleTab;
  label: string;
  icon: React.ReactNode;
  onClick: (v: ConsoleTab) => void;
}> = ({ current, value, label, icon, onClick }) => (
  <button
    onClick={() => onClick(value)}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
      current === value
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`}
  >
    {icon} {label}
  </button>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
      {icon}
    </div>
    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{title}</p>
    <p className="text-sm max-w-sm mx-auto">{body}</p>
  </div>
);
