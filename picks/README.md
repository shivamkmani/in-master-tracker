# Daily updates document

**Easiest:** use the site's editor page (`#/editor`, linked in the footer).
Paste the day's list straight from Word, Google Docs or email, check the
preview and publish. It saves a small file to `picks/inbox/`, which the next
workflow run merges into the archive (usually within 2 minutes). The editor
can also remove articles already on the site.

The editor signs in with a GitHub fine-grained token that has **Contents:
Read and write** on this repository only. The token stays in the browser.

## Uploading the whole document instead

Upload the latest copy of the daily news/policy updates document here as a
`.docx` (on GitHub: **Add file → Upload files**, then **Commit changes**).
The site picks it up within a few minutes, and again on every daily refresh.

- Only the newest `.docx` in this folder is read.
- Each day starts with a line that is just the date, e.g. `November 16`,
  `16 November 2026` or `16/11/2026`. A date without a year is read as the
  most recent such date, counting back from today.
- Short bold lines under a date become section headings.
- Each line with a link becomes one article; a trailing "– link" is dropped and
  extra links show as other sources. A plain line straight after it is
  shown as its note.
- Articles already on the site stay there, even if you trim old days out of
  the document.

Everything in this folder is public, like the rest of the repository.

Word files carry the author's name in their file properties, and anything in
this folder is downloadable. To keep that private, remove it first in Word
(File → Info → Check for Issues → Inspect Document → Document Properties),
or ask for the document to be imported without committing the file itself.
