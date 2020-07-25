export const pascalToCamelCase = (str: string): string => str.replace(/^([A-Z])/, (_, p1) => p1.toLowerCase());

export const pascalToPascalCase = (str: string): string => str;

export const pascalToKebabCase = (str: string): string => str.replace(/(?<!^)([A-Z])/g, '-$1').toLowerCase();
