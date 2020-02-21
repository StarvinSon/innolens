// https://wicg.github.io/construct-stylesheets/

interface CSSStyleSheetConstructor {
  prototype: CSSStyleSheet;
  new (options?: CSSStyleSheetInit): CSSStyleSheet;
}

interface CSSStyleSheetInit {
  media?: MediaList | string;
  title?: string;
  alternate?: boolean;
  disabled?: boolean;
}

interface CSSStyleSheet {
  replace(text: string): Promise<CSSStyleSheet>;
  replaceSync(text: string): void;
}

interface DocumentOrShadowRoot {
  adoptedStyleSheets: ReadonlyArray<CSSStyleSheet>;
}
