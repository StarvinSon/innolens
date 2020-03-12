declare module '*.scss' {
  export const css: import('lit-element').CSSResult;
  export const classes: Readonly<Record<string, string>>;
}
