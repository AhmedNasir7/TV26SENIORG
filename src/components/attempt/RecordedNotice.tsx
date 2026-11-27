/** What candidates are told is recorded, before and during the examination. */
export function RecordedNotice({ recorded }: { recorded: string[] }) {
  if (!recorded.length) return <p>Nothing about your screen or connection is recorded for review.</p>
  return (
    <>
      <p>These are noted for your examiner, with times:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {recorded.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <p className="mt-2 text-[color:var(--muted)]">
        They are prompts for a person to look, not proof of anything, and never change your score by themselves. No camera,
        microphone or screen recording is used.
      </p>
    </>
  )
}
