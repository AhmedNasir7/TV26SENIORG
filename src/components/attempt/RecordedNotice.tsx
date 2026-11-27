/** What candidates are told is recorded, before and during the examination. */
export function RecordedNotice({ recorded, live }: { recorded: string[]; live?: boolean }) {
  const items = live ? ['Your camera and microphone: watched live by your examiner and recorded', ...recorded] : recorded
  if (!items.length) return <p>Nothing about your screen or connection is recorded for review.</p>
  return (
    <>
      <p>These are noted for your examiner, with times:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <p className="mt-2 text-[color:var(--muted)]">
        They are prompts for a person to look, not proof of anything, and never change your score by themselves.
        {live ? ' Your screen is not recorded.' : ' No camera, microphone or screen recording is used.'}
      </p>
    </>
  )
}
