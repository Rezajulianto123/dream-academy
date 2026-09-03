/**
 * Extracts 11-character YouTube video ID from a raw Video ID or YouTube URL.
 * Supports formats:
 * - Direct ID: "dQw4w9WgXcQ"
 * - Watch URL: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 * - Short URL: "https://youtu.be/dQw4w9WgXcQ"
 * - Embed URL: "https://www.youtube.com/embed/dQw4w9WgXcQ"
 */
export function extractYoutubeVideoId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // If already 11-char alphanumeric/underscore/hyphen
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // URL pattern matching
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  }

  return trimmed;
}
