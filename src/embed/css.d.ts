// Only used within src/embed's own isolated TS program (see tsconfig.json in
// this folder) — deliberately excluded from the root tsconfig so this
// doesn't collide with Next's own `declare module '*.css' {}` (no exports)
// used for its ordinary side-effect CSS imports elsewhere in the app.
declare module "*.css" {
  const content: string;
  export default content;
}
