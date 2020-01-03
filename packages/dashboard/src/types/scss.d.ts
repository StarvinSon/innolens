declare module '*.scss' {
  export const styleCss: import('lit-element').CSSResult;
  export const styleClasses: Readonly<Record<string, string>>;
}
