/**
 * Explains why the submit button under a Turnstile widget is still disabled.
 * Without it, a widget that never loads (blocked by an ad blocker, or a
 * hostname missing from the Cloudflare widget settings) just leaves a grey
 * button and no clue why.
 */
export function CaptchaHint({ waiting, failed }: { waiting: boolean; failed: boolean }) {
  if (failed) {
    return (
      <p className="text-xs text-red-600">
        The security check couldn&apos;t load. Try turning off ad or tracker blockers for this site, then
        refresh the page.
      </p>
    );
  }
  if (waiting) {
    return <p className="text-xs text-gray-400">Waiting for the security check to finish…</p>;
  }
  return null;
}
