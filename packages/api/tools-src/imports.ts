import * as tsm from 'ts-morph';

import { VariableNameFactory } from './variable';


export const getRelativeImportPath = (sourceFile: tsm.SourceFile, path: string): string =>
  sourceFile
    .getRelativePathTo(sourceFile.getProject().getSourceFileOrThrow(`${path}.ts`))
    .slice(0, -'.ts'.length);


const specifierToIdentifier = (specifier: string): string =>
  specifier.replace(/[^\w]+/g, '_');

interface ImportDescriptor {
  defaultAlias: string | null;
  readonly namedImports: Map<string, string>;
}

export class Imports {
  public readonly createVarName: VariableNameFactory;

  private readonly _descriptors = new Map<string, ImportDescriptor>();

  public constructor(createVarName: VariableNameFactory) {
    this.createVarName = createVarName;
  }

  public addNamedImport(specifier: string, name: string): string {
    const descriptor = this._getOrCreateSpecifier(specifier);
    let alias = descriptor.namedImports.get(name);
    if (alias !== undefined) {
      return alias;
    }

    alias = this.createVarName(`${specifierToIdentifier(specifier)}_${name}`);
    descriptor.namedImports.set(name, alias);
    return alias;
  }

  public addDefaultImport(specifier: string): string {
    const descriptor = this._getOrCreateSpecifier(specifier);
    if (descriptor.defaultAlias !== null) {
      return descriptor.defaultAlias;
    }

    descriptor.defaultAlias = this.createVarName(`${specifierToIdentifier(specifier)}_default`);
    return descriptor.defaultAlias;
  }

  private _getOrCreateSpecifier(specifier: string): ImportDescriptor {
    let descriptor = this._descriptors.get(specifier);
    if (descriptor === undefined) {
      descriptor = {
        defaultAlias: null,
        namedImports: new Map()
      };
      this._descriptors.set(specifier, descriptor);
    }
    return descriptor;
  }

  public write(sourceFile: tsm.SourceFile): void {
    sourceFile.insertStatements(0, (writer) => {
      for (const [specifier, descriptor] of this._descriptors) {
        writer.write('import');

        if (descriptor.defaultAlias !== null) {
          writer.write(` ${descriptor.defaultAlias}`);
        }

        if (descriptor.namedImports.size > 0) {
          if (descriptor.defaultAlias !== null) writer.write(',');
          writer.write(' {');
          for (const [name, alias] of descriptor.namedImports) {
            writer.write(` ${name} as ${alias},`);
          }
          writer.write(' }');
        }

        writer.write(' from ').quote(specifier).newLine();
      }
    });
  }
}
