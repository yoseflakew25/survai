/**
 * Plans often store a composed research_goal like:
 *   "Survey title: Foo\n\nDescription: Bar\n\n…"
 * which can leak into survey.title. Normalize for UI.
 */
export function parseSurveyDisplayLabel(raw: string): {
  title: string;
  description: string | null;
} {
  const text = raw.trim();
  if (!text) return { title: 'Survey', description: null };

  const titleMatch = text.match(
    /Survey\s*title:\s*(.+?)(?=\s+Description:|$)/is
  );
  if (titleMatch) {
    const title = titleMatch[1].replace(/\s+/g, ' ').trim();
    const descMatch = text.match(/Description:\s*(.+?)(?=\n\n|$)/is);
    const description = descMatch?.[1]?.replace(/\s+/g, ' ').trim() || null;
    return { title: title || text, description };
  }

  return { title: text, description: null };
}

export function displaySurveyTitle(raw: string): string {
  return parseSurveyDisplayLabel(raw).title;
}

export function displaySurveyDescription(
  rawTitle: string,
  description: string | null | undefined
): string | null {
  const fromField = description?.trim();
  if (fromField) return fromField;
  return parseSurveyDisplayLabel(rawTitle).description;
}
