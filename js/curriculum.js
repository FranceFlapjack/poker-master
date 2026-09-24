// Reading content/curriculum.json.
//
// Two PARTS, not a numbered ladder of tracks. Basics is short and flat — four lessons, no sub-headings,
// because someone who has never played a hand should see a short list and not a syllabus. Tournament is
// the large part and is grouped into sections, because it will keep growing.
//
// A part holds EITHER `lessons` directly (flat, like Basics) or `sections` (grouped, like Tournament).
// `groupsOf` flattens that difference so nothing downstream has to care, and `flatten` gives the whole
// course as one ordered list for "next lesson" and progress counting.
//
// Pure — no DOM — so the Node checkers import it too. Three implementations of this walk would be three
// chances for the sidebar, the home page and the checkers to disagree about what exists.

/** A part's groups. A flat part becomes a single group carrying its own title. */
export function groupsOf(part) {
  if (Array.isArray(part.lessons)) {
    return [{ id: part.id, title: part.title, blurb: part.blurb, lessons: part.lessons, flat: true }]
  }
  return (part.sections || []).map(s => ({ ...s, flat: false }))
}

/** Parts the reader should see. Beginner parts are hidden once beginner mode is off. */
export function visibleParts(curriculum, { beginner = true } = {}) {
  return (curriculum.parts || []).filter(p => !p.beginner || beginner)
}

/**
 * The whole course as one ordered list.
 * `dir` is the folder under content/lessons/, which is the group id — not the part id.
 */
export function flatten(curriculum, opts = {}) {
  const out = []
  for (const part of visibleParts(curriculum, opts)) {
    for (const group of groupsOf(part)) {
      for (const lesson of group.lessons) {
        out.push({ ...lesson, dir: group.id, group: group.title, part: part.title, partId: part.id })
      }
    }
  }
  return out
}

/** Every lesson, including parts hidden by the current mode — what the checkers walk. */
export const allLessons = curriculum => flatten(curriculum, { beginner: true })

export const lessonId = (dir, slug) => `${dir}/${slug}`
export const lessonPath = (dir, slug) => `content/lessons/${dir}/${slug}.md`
