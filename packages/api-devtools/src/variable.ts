export interface VariableNameFactory {
  (name: string): string;
}

export const variableNameFactory = (): VariableNameFactory => {
  let i = 0;
  return (name) => {
    i += 1;
    return `${name}_${i}`;
  };
};
