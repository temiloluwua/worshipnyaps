import React, { useState, useEffect } from 'react';
import { ClipboardList, MapPin, Phone, AlertCircle, ListChecks, Plus, X, Eye, EyeOff, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DescriptionTemplate, AgendaSegment } from '../../lib/supabase';
import { T } from '../ui/T';
import { TwelveHourTimePicker } from '../ui/TimePicker';
import { formatTime12h } from '../../lib/eventFormat';

// The signature "how to create a vibe" flow from the landing page. Hosts pick
// segments to build an agenda; each can carry an optional time + note.
const VIBE_SEGMENTS = ['Fellowship', 'Communion', 'Worship', 'Prayer', 'Yap', 'Word', 'Games'];

// Per-event-type defaults. The "What to expect" text + starter agenda follow
// the event type selected at the top of the create/edit form.
const TYPE_DEFAULTS: Record<string, { whatToExpect: string; agenda: string[] }> = {
  bible_study: {
    whatToExpect: "We'll open in worship, share a short word, then dig into the passage together. Come as you are — no prep needed.",
    agenda: ['Fellowship', 'Worship', 'Word', 'Yap', 'Prayer'],
  },
  yap: {
    whatToExpect: "Casual hangout — bring something to share and let's yap. We'll eat, play, and end with prayer.",
    agenda: ['Fellowship', 'Communion', 'Games', 'Yap', 'Prayer'],
  },
  church: {
    whatToExpect: "Casual hangout — bring something to share and let's yap. We'll eat, play, and end with prayer.",
    agenda: ['Fellowship', 'Communion', 'Games', 'Yap', 'Prayer'],
  },
  evangelism: {
    whatToExpect: "We'll meet, pray together, then head out to share and serve. We'll encourage each other after.",
    agenda: ['Fellowship', 'Prayer', 'Word'],
  },
  volunteering: {
    whatToExpect: "We'll gather, get briefed, pray, then serve together. Come ready to help — every hand counts.",
    agenda: ['Fellowship', 'Prayer'],
  },
};

// ---------------------------------------------------------------------------
// Display (attendee-facing) — content auto-translates to the active language.
// ---------------------------------------------------------------------------
interface EventDescriptionDisplayProps { template: DescriptionTemplate; }

export const EventDescriptionDisplay: React.FC<EventDescriptionDisplayProps> = ({ template }) => {
  const { t } = useTranslation();
  const agenda = Array.isArray(template.agenda) ? template.agenda : [];
  const hasContent = template.whatToExpect || agenda.length > 0 || template.parkingDirections || template.contactInfo || template.specialNotes;
  if (!hasContent) return null;

  const contact = (template.contactInfo || '').trim();
  const contactHref = /@/.test(contact) ? `mailto:${contact}` : `tel:${contact.replace(/[^\d+]/g, '')}`;

  return (
    <div className="space-y-4">
      {template.whatToExpect && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">{t('eventTemplate.whatToExpect')}</h4>
          </div>
          <p className="text-blue-800 dark:text-blue-300 text-sm leading-relaxed whitespace-pre-wrap"><T>{template.whatToExpect}</T></p>
        </div>
      )}

      {agenda.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h4 className="font-semibold text-purple-900 dark:text-purple-200 text-sm">Gathering flow</h4>
          </div>
          <ol className="relative border-l-2 border-purple-200 dark:border-purple-800 ml-1 space-y-3">
            {agenda.map((seg, i) => (
              <li key={i} className="pl-4">
                <span className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-purple-400 dark:bg-purple-600" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-purple-900 dark:text-purple-200"><T>{seg.label}</T></span>
                  {seg.time && <span className="text-[11px] text-purple-600 dark:text-purple-400 inline-flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatTime12h(seg.time)}</span>}
                </div>
                {seg.note && <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5"><T>{seg.note}</T></p>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {template.parkingDirections && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">{t('eventTemplate.parkingDirections')}</h4>
          </div>
          <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed whitespace-pre-wrap"><T>{template.parkingDirections}</T></p>
        </div>
      )}

      {contact && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="font-semibold text-gray-900 dark:text-gray-200 text-sm">{t('eventTemplate.contactInfo')}</h4>
          </div>
          <a href={contactHref} className="text-blue-600 dark:text-blue-400 text-sm hover:underline break-all">{contact}</a>
        </div>
      )}

      {template.specialNotes && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <h4 className="font-semibold text-red-900 dark:text-red-200 text-sm">{t('eventTemplate.specialNotes')}</h4>
          </div>
          <p className="text-red-800 dark:text-red-300 text-sm leading-relaxed whitespace-pre-wrap"><T>{template.specialNotes}</T></p>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Form (host-facing)
// ---------------------------------------------------------------------------
interface EventDescriptionFormProps {
  template: DescriptionTemplate;
  onChange: (template: DescriptionTemplate) => void;
  eventType?: string;
}

export const EventDescriptionForm: React.FC<EventDescriptionFormProps> = ({ template, onChange, eventType }) => {
  const { t } = useTranslation();
  const agenda: AgendaSegment[] = Array.isArray(template.agenda) ? template.agenda : [];
  const [preview, setPreview] = useState(false);
  // Optional fields stay tucked away until the host wants them.
  const [openParking, setOpenParking] = useState(!!template.parkingDirections);
  const [openContact, setOpenContact] = useState(!!template.contactInfo);
  const [openNotes, setOpenNotes] = useState(!!template.specialNotes);

  const addSegment = (label: string) => onChange({ ...template, agenda: [...agenda, { label }] });
  const updateSegment = (i: number, patch: Partial<AgendaSegment>) =>
    onChange({ ...template, agenda: agenda.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const removeSegment = (i: number) => onChange({ ...template, agenda: agenda.filter((_, j) => j !== i) });

  // Follow the event type selected at the top: fill "What to expect" + the
  // starter agenda from the type's default, but never clobber content the host
  // has actually customized.
  useEffect(() => {
    const def = eventType ? TYPE_DEFAULTS[eventType] : undefined;
    if (!def) return;
    const wteIsDefault = !template.whatToExpect?.trim()
      || Object.values(TYPE_DEFAULTS).some(d => d.whatToExpect === template.whatToExpect);
    const agendaIsDefault = agenda.length === 0
      || Object.values(TYPE_DEFAULTS).some(d =>
        d.agenda.length === agenda.length && d.agenda.every((l, i) => agenda[i]?.label === l && !agenda[i]?.time && !agenda[i]?.note));
    if (!wteIsDefault && !agendaIsDefault) return;
    onChange({
      ...template,
      whatToExpect: wteIsDefault ? def.whatToExpect : template.whatToExpect,
      agenda: agendaIsDefault ? def.agenda.map((label) => ({ label })) : agenda,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setPreview(v => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
          {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <EventDescriptionDisplay template={template} />
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('eventTemplate.whatToExpect')}</label>
            <textarea
              value={template.whatToExpect || ''}
              onChange={(e) => onChange({ ...template, whatToExpect: e.target.value })}
              placeholder={t('eventTemplate.whatToExpectPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
            />
          </div>

          {/* Agenda / gathering flow */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4" /> Gathering flow <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            {agenda.length > 0 && (
              <div className="space-y-2 mb-2">
                {agenda.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                    <input
                      value={seg.label}
                      onChange={(e) => updateSegment(i, { label: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <TwelveHourTimePicker value={seg.time || ''} onChange={(v) => updateSegment(i, { time: v })} />
                    <button type="button" onClick={() => removeSegment(i)} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {VIBE_SEGMENTS.filter((s) => !agenda.some((a) => a.label === s)).map((s) => (
                <button key={s} type="button" onClick={() => addSegment(s)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100">
                  <Plus className="w-3 h-3" /> {s}
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible optional fields */}
          {!openParking ? (
            <button type="button" onClick={() => setOpenParking(true)} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600">
              <Plus className="w-3.5 h-3.5" /> Add parking / directions
            </button>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('eventTemplate.parkingDirections')}</label>
              <textarea
                value={template.parkingDirections || ''}
                onChange={(e) => onChange({ ...template, parkingDirections: e.target.value })}
                placeholder={t('eventTemplate.parkingPlaceholder')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
              />
            </div>
          )}

          {!openContact ? (
            <button type="button" onClick={() => setOpenContact(true)} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600">
              <Plus className="w-3.5 h-3.5" /> Add contact
            </button>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('eventTemplate.contactInfo')}</label>
              <input
                type="text"
                value={template.contactInfo || ''}
                onChange={(e) => onChange({ ...template, contactInfo: e.target.value })}
                placeholder={t('eventTemplate.contactPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          )}

          {!openNotes ? (
            <button type="button" onClick={() => setOpenNotes(true)} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600">
              <Plus className="w-3.5 h-3.5" /> Add special notes
            </button>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('eventTemplate.specialNotes')}</label>
              <textarea
                value={template.specialNotes || ''}
                onChange={(e) => onChange({ ...template, specialNotes: e.target.value })}
                placeholder={t('eventTemplate.specialNotesPlaceholder')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
