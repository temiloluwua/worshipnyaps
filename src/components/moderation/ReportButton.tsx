import React, { useState } from 'react';
import { Flag, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export type ReportTargetType =
  | 'user'
  | 'event'
  | 'topic'
  | 'community_post'
  | 'comment'
  | 'message'
  | 'announcement'
  | 'help_request'
  | 'location';

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  // Optional context shown in the modal so the reporter knows what they're reporting
  preview?: string;
  // The user who created the content — included so the report references both
  // the content AND the author
  authorId?: string;
  // Snapshot of the content for moderator review (in case the original is deleted)
  contentSnapshot?: Record<string, unknown>;
  // Skip setting the FK entity column. Used when the target ID doesn't live in
  // the table the column references (e.g. community_posts reported under the
  // 'topic' type). The ID is preserved in content_snapshot for moderators.
  skipEntityRef?: boolean;
}

interface ReportButtonProps {
  target: ReportTarget;
  className?: string;
  variant?: 'icon' | 'text' | 'menu-item';
  label?: string;
}

const CATEGORIES = [
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'false_information', label: 'False or misleading' },
  { value: 'other', label: 'Something else' },
] as const;

const ENTITY_COLUMN_BY_TYPE: Record<ReportTargetType, string | null> = {
  user: null, // uses reported_user_id from authorId
  event: 'reported_event_id',
  topic: 'reported_topic_id',
  community_post: 'reported_community_post_id',
  comment: 'reported_comment_id',
  message: 'reported_message_id',
  announcement: 'reported_announcement_id',
  help_request: 'reported_help_request_id',
  location: 'reported_location_id',
};

export const ReportButton: React.FC<ReportButtonProps> = ({ target, className, variant = 'icon', label }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<typeof CATEGORIES[number]['value']>('inappropriate_behavior');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Hide the button when the user can't actually report (not signed in, or
  // they're trying to report themselves)
  if (!user) return null;
  if (target.authorId && target.authorId === user.id) return null;

  const handleSubmit = async () => {
    if (description.trim().length < 5) {
      toast.error('Please add a brief description so we know what happened.');
      return;
    }
    setSubmitting(true);
    try {
      const row: Record<string, unknown> = {
        reporter_id: user.id,
        report_type: target.type,
        category,
        description: description.trim(),
        severity: category === 'safety_concern' || category === 'harassment' ? 'high' : 'medium',
      };
      if (target.authorId) row.reported_user_id = target.authorId;
      const entityCol = ENTITY_COLUMN_BY_TYPE[target.type];
      if (entityCol && !target.skipEntityRef) row[entityCol] = target.id;
      // Merge the raw id into the snapshot so moderators can still trace it
      // when we're skipping the FK column (e.g. community_posts).
      const snapshot = {
        ...(target.contentSnapshot || {}),
        ...(target.skipEntityRef ? { target_id: target.id, target_type: target.type } : {}),
      };
      if (Object.keys(snapshot).length > 0) row.content_snapshot = snapshot;

      const { error } = await supabase.from('reports').insert(row);
      if (error) throw error;

      toast.success('Report submitted. Thank you — our team will review it.');
      setOpen(false);
      setDescription('');
      setCategory('inappropriate_behavior');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const triggerClass = (() => {
    if (className) return className;
    switch (variant) {
      case 'icon':
        return 'p-1.5 text-gray-400 hover:text-red-600 transition-colors';
      case 'text':
        return 'text-xs text-gray-500 hover:text-red-600 transition-colors';
      case 'menu-item':
        return 'w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md flex items-center gap-2 transition-colors';
      default:
        return 'p-1.5 text-gray-400 hover:text-red-600 transition-colors';
    }
  })();

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={triggerClass}
        title="Report"
        aria-label="Report content"
      >
        {variant === 'icon' && <Flag className="w-4 h-4" />}
        {variant === 'text' && (label || 'Report')}
        {variant === 'menu-item' && (<><Flag className="w-4 h-4" /> {label || 'Report'}</>)}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Report content</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {target.preview && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 line-clamp-3">
                  "{target.preview}"
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Why are you reporting this?
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  What happened?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Tell us what's wrong so we can take action..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 resize-none"
                />
                <p className="mt-1 text-xs text-gray-400 text-right">{description.length}/500</p>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                For emergencies or threats of harm, please also contact local authorities. See
                our <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Community Guidelines</a> for what we prohibit.
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || description.trim().length < 5}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Submit report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
