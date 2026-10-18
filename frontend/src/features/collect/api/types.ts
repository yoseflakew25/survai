// ============================================================
// Collect Types — publish / stats (plan.md §6 COL)
// ============================================================

export interface CollectStats {
  surveyId: string;
  responseCount: number;
  currentVersionId: string | null;
  status: string;
  collectionPath: string | null;
}

export interface PublishResult {
  surveyId: string;
  versionId: string;
  versionNumber: number;
  status: string;
  publishedAt: string;
  collectionPath: string;
}
