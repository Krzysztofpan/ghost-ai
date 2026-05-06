Read `AGENTS.md` before starting.

We're adding the design system and UI primitive components.

Install and configure `shadcn/ui`.

Add these shadcn compontents:
- Button
- Card
- Dialog
- Input
- Tabs
- Textarea
- ScrollArea

Do not modify the generated `compontents/ui/*` files after installation.

Also Install `lucide-react`.

Create `lib/utils.ts` with reusable `cn()` helper for merging Tailwind classes.

Ensure all components match the existing dark theme in `globals.css`.

### Check when done
- All components import without errors
- `cn()` works properly
- No default light styling appears