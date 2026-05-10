_Add new issue notes here when something breaks._

Last resolved: connection dots sat on the node bounding box while shapes used inset outlines (circle, hexagon, cylinder, diamond), so wires missed the visible handles — fixed via `lib/canvas-handle-layout.ts`, stacked source/target handles per side, `isValidConnection` (no self-links), and `connectionRadius`. See `context/progress-tracker.md`.
