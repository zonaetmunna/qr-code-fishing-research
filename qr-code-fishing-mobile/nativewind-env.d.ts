/// <reference types="nativewind/types" />

// CSS imports are handled by Metro at build time; declare them so `tsc` (which
// doesn't run Metro) can resolve the side-effect import of global.css and any
// CSS modules used by the template's web components.
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}
