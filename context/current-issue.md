somethin went wrong when i started aplications, i got 2 errors:

## First error

(node:26110) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)

## Second Error

Invalid `{imported module ./lib/prisma.ts}["prisma"].project.findMany()` invocation in
/home/krzysztof/Pulpit/ghost-ai/.next/dev/server/chunks/ssr/[root-of-the-server]__0rchei3._.js:144:185

  141         name: true
  142     }
  143 }),
→ 144 userEmails.length === 0 ? Promise.resolve([]) : {imported module ./lib/prisma.ts}["prisma"].project.findMany(
The column `t0.email` does not exist in the current database.
lib/project-data.ts (31:24) @ <unknown>


  29 |     userEmails.length === 0
  30 |       ? Promise.resolve([])
> 31 |       : prisma.project.findMany({
     |                        ^
  32 |           where: {
  33 |             collaborators: {
  34 |               some: {
Call Stack
9

Show 5 ignore-listed frame(s)
<unknown>
lib/project-data.ts (31:24)
Promise.all
<anonymous>
getEditorProjectsData
lib/project-data.ts (23:43)
EditorPage
app/editor/page.tsx (5:45)

## What to do

- try to solve errors with no impact of implementations others things
- if you are not sure what to do try to check solution in internet
- when you done check if npm run dev is passes with correct initial render