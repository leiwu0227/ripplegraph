## Round 1

- Addressed F1.1 by regenerating tracked `dist/` artifacts with `npm run build` so `bin/ripplegraph` imports the updated graph command implementation and public exports.
- Added a built-bin regression assertion to the existing CLI graph registry flow so `npm test` exercises `bin/ripplegraph graph list` in addition to the source CLI harness.
