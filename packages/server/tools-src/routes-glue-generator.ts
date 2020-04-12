import { join } from 'path';

import { pascalToCamelCase, pascalToPascalCase, pascalToKebabCase } from '@innolens/api/tools/case';
import { Imports, getRelativeImportPath } from '@innolens/api/tools/imports';
import { IndexSpec, EndpointSpec } from '@innolens/api/tools/spec';
import { variableNameFactory } from '@innolens/api/tools/variable';
import * as tsm from 'ts-morph';


const writeRoutesGlueFile = (
  sourceFile: tsm.SourceFile,
  specs: ReadonlyArray<readonly [IndexSpec, ReadonlyArray<EndpointSpec>]>
): void => {
  const createVarName = variableNameFactory();
  const imports = new Imports(createVarName);

  const koaRouterExpr = imports.addDefaultImport('@koa/router');

  sourceFile.addVariableStatement({
    isExported: true,
    declarationKind: tsm.VariableDeclarationKind.Const,
    declarations: [{
      name: 'glueRoutes',
      initializer: (writer) => {
        writer.newLine().write('(').withIndentationLevel(writer.getIndentationLevel() + 1, () => {
          writer.writeLine(`router: ${koaRouterExpr},`);
          writer.write('controllers:').block(() => {
            for (const [indexSpec] of specs) {
              const controllerTypeExpr = imports.addNamedImport(
                getRelativeImportPath(sourceFile, `./src/controllers/glues/${pascalToKebabCase(indexSpec.name)}`),
                `${pascalToPascalCase(indexSpec.name)}ControllerGlue`
              );
              writer.writeLine(`${pascalToCamelCase(indexSpec.name)}: ${controllerTypeExpr},`);
            }
          });
        }).write('): void =>').block(() => { // eslint-disable-line newline-per-chained-call
          for (const [indexSpec, endptSpecs] of specs) {
            writer.newLine();
            writer.writeLine(`// ${indexSpec.name}`);
            for (const endptSpec of endptSpecs) {
              writer
                .write(`router.${endptSpec.method}(`)
                .quote(endptSpec.path).write(', ')
                .write(`controllers.${pascalToCamelCase(indexSpec.name)}.${pascalToCamelCase(endptSpec.name)}.bind(controllers.${pascalToCamelCase(indexSpec.name)})`)
                .write(')').newLine(); // eslint-disable-line newline-per-chained-call
            }
          }
        });
      }
    }]
  });

  imports.write(sourceFile);
};

export const createRoutesGlueFile = (
  project: tsm.Project,
  specs: ReadonlyArray<readonly [IndexSpec, ReadonlyArray<EndpointSpec>]>
): tsm.SourceFile => {
  const sourceFile = project.createSourceFile(
    join(__dirname, '../src/routes/glue.ts'),
    '',
    { scriptKind: tsm.ScriptKind.TS, overwrite: true }
  );
  try {
    writeRoutesGlueFile(sourceFile, specs);
  } catch (err) {
    const wrappedError = new Error('Error while writing routes');
    wrappedError.stack += `\n--- The above error was caused by the following error ---\n${err.stack}`;
    throw wrappedError;
  }
  return sourceFile;
};
