I want to User can write on the lines between shapes, for now User can't write any text on the line but widow to write display correctly.

### Implement writing on the line

- make sure that user can write on the lines between shapes
- don't change any implementation of writing on the shapes this works correctlly
- if thext is too long should be wrapped and displaying only if user have focus on the line

### Check if done

- User can write text on the line between two shapes — **done** (`canvas-edge.tsx`: textarea, interaction fixes)
- All users and user can see this text — **done** (`updateEdgeData` / Liveblocks unchanged)
- `npm run build` passes — **verified**
- Any other implementation doesn't change — **done** (only `canvas-edge.tsx` + progress tracker)
