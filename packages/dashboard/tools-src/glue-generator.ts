import { join } from 'path';

import { getAllSpecs } from '@innolens/api/tools';
import { pascalToKebabCase } from '@innolens/api/tools/case';
import { Imports } from '@innolens/api/tools/imports';
import { writeJsonDecoder } from '@innolens/api/tools/json-parser';
import { writeJsonStringifier } from '@innolens/api/tools/json-stringifier';
import { writeQueryEncoder } from '@innolens/api/tools/query-stringifier';
import { writeSchemaType } from '@innolens/api/tools/schema';
import { IndexSpec, EndpointSpec, parseEndpointSpecPath } from '@innolens/api/tools/spec';
import { variableNameFactory } from '@innolens/api/tools/variable';
import * as tsm from 'ts-morph';


const writeGlueFile = (
  sourceFile: tsm.SourceFile,
  indexSpec: IndexSpec,
  endptSpec: EndpointSpec
): void => {
  const createVarName = variableNameFactory();
  const imports = new Imports(createVarName);

  sourceFile.addVariableStatements([
    {
      isExported: true,
      declarationKind: tsm.VariableDeclarationKind.Const,
      declarations: [{
        name: 'createRequest',
        initializer: (writer) => {

          const writeOptsType = (): void => {
            writer.inlineBlock(() => {

              // Params
              const paramSpecs = parseEndpointSpecPath(endptSpec.path);
              if (paramSpecs.names.length > 0) {
                writer.write('readonly params:').block(() => {
                  for (const paramName of paramSpecs.names) {
                    writer.writeLine(`readonly ${paramName}: string`);
                  }
                });
              }

              // Query
              if (endptSpec.query !== undefined && Object.keys(endptSpec).length > 0) {
                writer.write('readonly query:').block(() => {
                  for (const [queryName, querySpec] of Object.entries(endptSpec.query!)) {
                    writer.write(`readonly ${queryName}`);
                    if (!querySpec.required) writer.write('?');
                    writer.write(': ');
                    writeSchemaType(sourceFile, writer, imports, querySpec.schema);
                    writer.newLine();
                  }
                });
              }

              // Authentication
              if (endptSpec.authentication !== undefined) {
                switch (endptSpec.authentication.type) {
                  case 'bearer': {
                    writer.write('readonly authentication:').block(() => {
                      writer.writeLine('readonly token: string');
                    });
                    break;
                  }
                  default: {
                    throw new Error(`Unsupported authentication: ${JSON.stringify(endptSpec.authentication)}`);
                  }
                }
              }

              // Request Body
              if (endptSpec.requestBody !== undefined) {
                writer.write('readonly body: ');
                writeSchemaType(sourceFile, writer, imports, endptSpec.requestBody.schema);
              }
            });
          };

          writer.write('(opts: ');
          writeOptsType();
          writer.write('): Request =>').block(() => {

            // Path and Params
            const pathSpec = parseEndpointSpecPath(endptSpec.path);
            let templateString = pathSpec.statics[0];
            for (let i = 0; i < pathSpec.names.length; i += 1) {
              templateString += `\${encodeURIComponent(opts.params.${pathSpec.names[i]})}`;
              templateString += pathSpec.statics[i + 1];
            }
            templateString = `\`${templateString}\``;

            const urlVar = createVarName('url');
            writer.writeLine(`const ${urlVar} = new URL(${templateString}, globalThis.location.href)`);

            // Query
            if (endptSpec.query !== undefined && Object.keys(endptSpec.query).length > 0) {
              for (const [queryName, querySpec] of Object.entries(endptSpec.query)) {
                if (!querySpec.required) {
                  writer.write(`if (opts.query.${queryName} !== undefined) {`).newLine()
                    .setIndentationLevel(writer.getIndentationLevel() + 1);
                }

                const encodedQueryVar = createVarName('encodedQuery');
                writer.writeLine(`let ${encodedQueryVar}`);
                writeQueryEncoder(
                  sourceFile, writer, createVarName, imports,
                  encodedQueryVar, `opts.query.${queryName}`, querySpec.schema,
                  'web'
                );

                writer.write(`if (${encodedQueryVar} === undefined)`).block(() => {
                  writer.writeLine(`throw new Error('Failed to encode query ${JSON.stringify(queryName)}')`);
                });
                writer.write(`${urlVar}.searchParams.set(`).quote(queryName).write(`, String(${encodedQueryVar}))`).newLine();

                if (!querySpec.required) {
                  writer.newLine()
                    .setIndentationLevel(writer.getIndentationLevel() - 1).write('}').newLine();
                }
              }
            }

            // RequestInit
            const reqInitVar = createVarName('reqInit');
            writer.writeLine(`const ${reqInitVar}: RequestInit = {}`);

            let _headerGenerated = false;
            const writeReqInitHeader = (keyExpr: string, valExpr: string): void => {
              if (!_headerGenerated) {
                _headerGenerated = true;
                writer.writeLine(`${reqInitVar}.headers = {}`);
              }
              writer.writeLine(`${reqInitVar}.headers[${keyExpr}] = ${valExpr}`);
            };

            // Method
            writer.write(`${reqInitVar}.method = `).quote(endptSpec.method);

            // Authentication
            if (endptSpec.authentication !== undefined) {
              switch (endptSpec.authentication.type) {
                case 'bearer': {
                  // eslint-disable-next-line no-template-curly-in-string
                  writeReqInitHeader("'Authorization'", '`Bearer ${opts.authentication.token}`');
                  break;
                }
                default: {
                  throw new Error(`Unsupported authentication: ${JSON.stringify(endptSpec.authentication)}`);
                }
              }
            }

            // Request Body
            if (endptSpec.requestBody !== undefined) {
              switch (endptSpec.requestBody.contentType) {
                case 'application/json': {
                  writeReqInitHeader("'Content-Type'", "'application/json'");
                  writeJsonStringifier(
                    sourceFile, writer, createVarName, imports,
                    `${reqInitVar}.body`, 'opts.body', endptSpec.requestBody.schema,
                    'web', false
                  );
                  writer.write(`if (${reqInitVar}.body === undefined)`).block(() => {
                    writer.write('throw new Error(').quote('Failed to stringify body').write(')').newLine();
                  });
                  break;
                }
                default: {
                  throw new Error(`Unsupported request body type ${endptSpec.requestBody.contentType}`);
                }
              }
            }

            // Cache
            writer.write(`${reqInitVar}.cache = `).quote('no-store').newLine();

            writer.writeLine(`return new Request(${urlVar}.href, ${reqInitVar})`);
          });
        }
      }]
    }
  ]);

  sourceFile.addVariableStatement({
    isExported: true,
    declarationKind: tsm.VariableDeclarationKind.Const,
    declarations: [{
      name: 'handleResponse',
      initializer: (writer) => {

        const writeReturnType = (): void => {
          writer.write('Promise<');
          if (endptSpec.responseBody === undefined) {
            writer.write('void');
          } else {
            writeSchemaType(
              sourceFile, writer, imports,
              endptSpec.responseBody.data.schema
            );
          }
          writer.write('>');
        };

        writer.write('async (res: Response): ');
        writeReturnType();
        writer.write(' =>').block(() => {

          writer.write('if (!res.ok)').block(() => {
            writer.writeLine("throw new Error('Server response not ok')");
          });

          if (endptSpec.responseBody !== undefined) {
            const encodedBodyVar = createVarName('encodedBody');
            writer.writeLine(`const ${encodedBodyVar} = await res.json()`);

            const decodedDataVar = createVarName('decodedData');
            writer.writeLine(`let ${decodedDataVar}`);
            writeJsonDecoder(
              sourceFile, writer, createVarName, imports,
              decodedDataVar, `${encodedBodyVar}.data`, endptSpec.responseBody.data.schema,
              'web', true
            );

            writer.write(`if (${decodedDataVar} === undefined)`).block(() => {
              writer.write('throw new Error(').quote('Unable to decode data').write(')').newLine();
            });
            writer.writeLine(`return ${decodedDataVar}`);
          }
        });
      }
    }]
  });

  imports.write(sourceFile);
};

const createGlueFile = (
  project: tsm.Project,
  indexSpec: IndexSpec,
  endptSpec: EndpointSpec
): tsm.SourceFile => {
  const sourceFile = project.createSourceFile(
    join(__dirname, `../src/services/glues/${pascalToKebabCase(indexSpec.name)}/${pascalToKebabCase(endptSpec.name)}.ts`),
    '',
    { scriptKind: tsm.ScriptKind.TS, overwrite: true }
  );
  try {
    writeGlueFile(sourceFile, indexSpec, endptSpec);
  } catch (err) {
    const wrappedError = new Error(`Error while writing glue: index=${indexSpec.name}`);
    wrappedError.stack += `\n--- The above error was caused by the following error ---\n${err.stack}`;
    throw wrappedError;
  }
  return sourceFile;
};

const createGlueFiles = (
  project: tsm.Project,
  specs: ReadonlyArray<readonly [IndexSpec, ReadonlyArray<EndpointSpec>]>
): Array<tsm.SourceFile> =>
  specs.flatMap(([indexSpec, endptSpecs]) =>
    endptSpecs.map((endptSpec) =>
      createGlueFile(project, indexSpec, endptSpec)));


const writeGlueIndexFile = (
  sourceFile: tsm.SourceFile,
  indexSpec: IndexSpec,
  endptSpecs: ReadonlyArray<EndpointSpec>
): void => {
  sourceFile.addStatements((writer) => {
    for (const endptSpec of endptSpecs) {
      writer.write(`export * as ${endptSpec.name} from `).quote(`./${pascalToKebabCase(endptSpec.name)}`).newLine();
    }
  });
};

const createGlueIndexFile = (
  project: tsm.Project,
  indexSpec: IndexSpec,
  endptSpecs: ReadonlyArray<EndpointSpec>
): tsm.SourceFile => {
  const sourceFile = project.createSourceFile(
    `./src/services/glues/${pascalToKebabCase(indexSpec.name)}/index.ts`,
    '',
    { scriptKind: tsm.ScriptKind.TS, overwrite: true }
  );
  writeGlueIndexFile(sourceFile, indexSpec, endptSpecs);
  return sourceFile;
};

const createGlueIndexFiles = (
  project: tsm.Project,
  specs: ReadonlyArray<readonly [IndexSpec, ReadonlyArray<EndpointSpec>]>
): Array<tsm.SourceFile> =>
  specs.map(([indexSpec, endptSpecs]) =>
    createGlueIndexFile(project, indexSpec, endptSpecs));


const main = async (): Promise<void> => {
  const specs = await getAllSpecs();

  const project = new tsm.Project({
    tsConfigFilePath: join(__dirname, '../tsconfig-dashboard.json'),
    manipulationSettings: {
      indentationText: tsm.IndentationText.TwoSpaces,
      quoteKind: tsm.QuoteKind.Single,
      useTrailingCommas: false
    }
  });

  const generateSourceFiles = [
    ...createGlueFiles(project, specs),
    ...createGlueIndexFiles(project, specs)
  ];

  for (const sourceFile of generateSourceFiles) {
    sourceFile.insertStatements(0, (writer) => {
      writer
        .writeLine('//')
        .writeLine('// ⚠️ This is an auto generated file. DO NOT modify it. ⚠️')
        .writeLine('//')
        .newLine();
    });
    sourceFile.formatText();
  }

  await Promise.all(generateSourceFiles.map((sf) => sf.save()));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
