import { loader as WebpackLoader } from 'webpack';


const camelCaseRegExp = /-([^-])/g;

const toCamelCase = (string: string): string =>
  string.replace(camelCaseRegExp, (match, char) => char.toUpperCase());

const localRegExp = /^(exports\.locals\s*=\s*)(\{.*?\})/ms;

const loader: WebpackLoader.Loader = function(source) {
  return String(source).replace(localRegExp, (match, declaration, localsJson) => {
    const locals = JSON.parse(localsJson);
    const convertedLocals = Object.fromEntries(Object.entries(locals)
      .map(([key, value]) => {
        const [blockNameAndModifierName, elementAndModifierName = /** @type {string | null} */ (null)] = key.split('__', 2);
        let blockName: string | null;
        let elementName: string | null;
        let modifierName: string | null;
        if (elementAndModifierName === null) {
          elementName = null;
          [blockName, modifierName = null] = blockNameAndModifierName.split('--', 2);
        } else {
          blockName = blockNameAndModifierName;
          [elementName, modifierName = null] = elementAndModifierName.split('--', 2);
        }
        let convertedKey = toCamelCase(blockName);
        if (elementName !== null) convertedKey += `_${toCamelCase(elementName)}`;
        if (modifierName !== null) convertedKey += `_$${toCamelCase(modifierName)}`;
        return [convertedKey, value];
      }));
    return `${declaration}${JSON.stringify(convertedLocals)}`;
  });
};

module.exports = loader;
