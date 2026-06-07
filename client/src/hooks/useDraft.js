import { useEffect, useState, useCallback } from 'react';
import { saveDraft, loadDraft, clearDraft } from '@/utils/draftManager';
import toast from 'react-hot-toast';

export function useDraft(sessionId) {
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [hasDraft,    setHasDraft]    = useState(false);

  // Restore draft on mount
  const restoreDraft = useCallback(async (onRestore) => {
    if (!sessionId) return null;
    const draft = await loadDraft(sessionId);
    if (draft) {
      setHasDraft(true);
      return draft.records;
    }
    return null;
  }, [sessionId]);

  // Auto-save whenever records change
  const saveToDraft = useCallback(async (records) => {
    if (!sessionId || !records?.length) return;
    await saveDraft(sessionId, records);
  }, [sessionId]);

  // Clear after successful submit
  const discardDraft = useCallback(async () => {
    if (!sessionId) return;
    await clearDraft(sessionId);
    setHasDraft(false);
  }, [sessionId]);

  return { restoreDraft, saveToDraft, discardDraft, hasDraft };
}
