<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:local-notes -->
## Note on the Next.js docs path above

Those docs ship *inside* `node_modules`, so they only exist after `npm install`
has completed. On a fresh clone, run `npm install` first — if
`node_modules/next/dist/docs/` is missing, that is why, not a broken repo.
<!-- END:local-notes -->
