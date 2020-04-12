import { join } from 'path';

import { pascalToPascalCase, pascalToCamelCase, pascalToKebabCase } from '@innolens/api/tools/case';
import { Imports, getRelativeImportPath } from '@innolens/api/tools/imports';
import { writeJsonDecoder } from '@innolens/api/tools/json-parser';
import { writeJsonEncoder } from '@innolens/api/tools/json-stringifier';
import { writeQueryDecoder } from '@innolens/api/tools/query-parser';
import { writeSchemaType } from '@innolens/api/tools/schema';
import { IndexSpec, EndpointSpec, parseEndpointSpecPath } from '@innolens/api/tools/spec';
import { variableNameFactory } from '@innolens/api/tools/variable';
import * as tsm from 'ts-morph';


const writeControllerGlueFile = (
  sourceFile: tsm.SourceFile,
  indexSpec: IndexSpec,
  endptSpecs: ReadonlyArray<EndpointSpec>
): void => {
  const createVarName = variableNameFactory();
  const imports = new Imports(createVarName);

  let requireCheckBearerTokenMethod = false;

  const controllerClass = sourceFile.addClass({
    name: `${pascalToPascalCase(indexSpec.name)}ControllerGlue`,
    isAbstract: true,
    isExported: true
  });

  const controllerNamespace = sourceFile.addNamespace({
    name: controllerClass.getName()!,
    isExported: true
  });

  for (const endptSpec of endptSpecs) {
    try {
      const routerContextExpr = imports.addNamedImport(getRelativeImportPath(sourceFile, './src/controllers/context'), 'RouterContext');
      const contextInterface = controllerNamespace.addInterface({
        name: `${pascalToPascalCase(endptSpec.name)}Context`,
        isExported: true,
        extends: [routerContextExpr]
      });

      // AuthenticationType
      if (endptSpec.authentication !== undefined) {
        switch (endptSpec.authentication.type) {
          case 'bearer': {
            contextInterface.addProperty({
              name: 'authentication',
              isReadonly: true,
              type: (writer) => {
                writer.block(() => {
                  writer.writeLine('readonly token: string');
                });
              }
            });
            break;
          }
          default: {
            throw new Error(`Unsupported authentication type: ${endptSpec.authentication.type}`);
          }
        }
      }

      // Param Type
      // { typeId: string, instanceId: string }
      const specPath = parseEndpointSpecPath(endptSpec.path);
      contextInterface.addProperty({
        name: 'params',
        isReadonly: true,
        type: (writer) => {
          writer.block(() => {
            for (const paramName of specPath.names) {
              writer.writeLine(`readonly ${paramName}: string`);
            }
          });
        }
      });

      // Query Type
      // { groupBy?: string, pastHours?: number }
      contextInterface.addProperty({
        name: 'query',
        isReadonly: true,
        type: (writer) => {
          writer.block(() => {
            if (endptSpec.query !== undefined) {
              for (const [key, querySpec] of Object.entries(endptSpec.query!)) {
                writer.write(`readonly ${key}`);
                if (!querySpec.required) {
                  writer.write('?');
                }
                writer.write(': ');
                writeSchemaType(
                  sourceFile, writer, imports,
                  querySpec.schema
                );
                writer.newLine();
              }
            }
          });
        }
      });

      // Request Body Type
      // { deleteFromTime: Date | null , deleteToTime: Date | null }
      if (endptSpec.requestBody !== undefined) {
        contextInterface.addProperty({
          name: 'requestBody',
          isReadonly: true,
          type: (writer) => {
            writeSchemaType(
              sourceFile, writer, imports,
              endptSpec.requestBody!.schema
            );
          }
        });
      }

      // Response Body Data Type
      // { deleteFromTime: Date | null , deleteToTime: Date | null }
      if (endptSpec.responseBody?.data?.schema !== undefined) {
        contextInterface.addProperty({
          name: 'responseBodyData',
          type: (writer) => {
            writeSchemaType(
              sourceFile, writer, imports,
              endptSpec.responseBody!.data!.schema!
            );
          }
        });
      }

      // protected abstract handlePostSomething(ctx: PostSomethingContext): Promise<void>;
      const handlerMethod = controllerClass.addMethod({
        name: `handle${pascalToPascalCase(endptSpec.name)}`,
        scope: tsm.Scope.Protected,
        isAbstract: true,
        parameters: [{
          name: 'ctx',
          type: `${controllerNamespace.getName()}.${contextInterface.getName()}`
        }],
        returnType: 'Promise<void>'
      });

      // public async postSomething(ctx: RouterContext): Promise<void> { ... }
      controllerClass.addMethod({
        name: pascalToCamelCase(endptSpec.name),
        scope: tsm.Scope.Public,
        isAsync: true,
        parameters: [{
          name: 'ctx',
          type: routerContextExpr
        }],
        returnType: 'Promise<void>',
        // eslint-disable-next-line no-loop-func
        statements: (writer) => {

          // Authentication
          if (endptSpec.authentication !== undefined) {
            switch (endptSpec.authentication.type) {
              case 'bearer': {
                const badRequestExpr = imports.addNamedImport('http-errors', 'BadRequest');
                const unauthorizedExpr = imports.addNamedImport('http-errors', 'Unauthorized');
                requireCheckBearerTokenMethod = true;
                writer.writeLine("const token = ctx.get('Authorization')?.slice('Bearer '.length)");
                writer.write("if (token === undefined || token === '')").block(() => {
                  writer.writeLine(`throw new ${badRequestExpr}('Invalid Authorization header')`);
                });
                writer.write('if (!await this.checkBearerToken(token))').block(() => {
                  writer.writeLine(`throw new ${unauthorizedExpr}('Invalid bearer token')`);
                });
                writer.write('ctx.authentication =').block(() => {
                  writer.writeLine('token');
                });
                break;
              }
              default: {
                throw new Error(`Unsupported authentication type: ${endptSpec.authentication.type}`);
              }
            }
          }

          // Parse URL Params
          if (specPath.names.length > 0) {
            for (const paramName of specPath.names) {
              writer.writeLine(`ctx.params.${paramName} = decodeURIComponent(ctx.params.${paramName})`);
            }
          }

          // Parse URL Query
          if (endptSpec.query !== undefined && Object.keys(endptSpec.query).length > 0) {
            const badRequestExpr = imports.addNamedImport('http-errors', 'BadRequest');

            for (const [queryName, querySpec] of Object.entries(endptSpec.query)) {
              writer.write(`if (ctx.query.${queryName} !== undefined)`).block(() => {
                writer.write('try').block(() => {
                  const decodedQueryVar = createVarName('decodedQuery');
                  writer.writeLine(`let ${decodedQueryVar}`);
                  writeQueryDecoder(
                    sourceFile, writer, createVarName, imports,
                    decodedQueryVar, `ctx.query.${queryName}`, querySpec.schema,
                    'node'
                  );

                  writer.write(`if (${decodedQueryVar} === undefined)`).block(() => {
                    writer.write(`throw new Error('Parsing error for query ${queryName}')`);
                  });
                  writer.writeLine(`ctx.query.${queryName} = ${decodedQueryVar}`);

                }).write('catch').block(() => {
                  writer.writeLine(`throw new ${badRequestExpr}('Invalid value for query ${JSON.stringify(queryName)}')`);
                });
              });
              if (querySpec.required) {
                writer.write('else').block(() => {
                  writer.writeLine(`throw new ${badRequestExpr}('Missing query ${JSON.stringify(queryName)}')`);
                });
              }
            }
          }

          // Parse Request Body
          if (endptSpec.requestBody !== undefined) {
            switch (endptSpec.requestBody.contentType) {
              case 'application/json': {
                const parseJsonFunc = imports.addNamedImport('co-body', 'json');
                const badRequestClass = imports.addNamedImport('http-errors', 'BadRequest');

                writer.write('try').inlineBlock(() => {
                  const encodedReqBodyVar = createVarName('encodedRequestBody');
                  writer.writeLine(`const ${encodedReqBodyVar} = await ${parseJsonFunc}(ctx)`);

                  writeJsonDecoder(
                    sourceFile, writer, createVarName, imports,
                    'ctx.requestBody', encodedReqBodyVar, endptSpec.requestBody!.schema,
                    'node', false
                  );
                  writer.write('if (ctx.requestBody === undefined)').block(() => {
                    writer.writeLine(`throw new ${badRequestClass}('Invalid body')`);
                  });

                }).write('catch').inlineBlock(() => {
                  writer.writeLine(`throw new ${badRequestClass}('Invalid body')`);
                });

                break;
              }
              default: {
                throw new Error(`Unsupported request body content type: ${endptSpec.requestBody.contentType}`);
              }
            }
          }

          // Call handler
          writer.writeLine(`await this.${handlerMethod.getName()}(ctx as ${controllerNamespace.getName()}.${contextInterface.getName()})`);

          // Parse Response Body Data
          if (endptSpec.responseBody?.data?.schema !== undefined) {
            writer.write('if (ctx.responseBodyData === undefined)').block(() => {
              writer.writeLine("throw new Error('Missing response body data')");
            });

            const encodedResponseBodyDataVar = createVarName('encodedResponseBodyData');
            writer.writeLine(`let ${encodedResponseBodyDataVar}`);
            writeJsonEncoder(
              sourceFile, writer, createVarName, imports,
              encodedResponseBodyDataVar, 'ctx.responseBodyData', endptSpec.responseBody.data.schema,
              'node', false
            );
            writer.write(`if (${encodedResponseBodyDataVar} === undefined)`).block(() => {
              writer.write('throw new Error(').quote('Failed to encode response body data').write(')').newLine();
            });

            writer.write('ctx.body =').block(() => {
              writer.writeLine(`data: ${encodedResponseBodyDataVar}`);
            });
          }
        }
      });
    } catch (err) {
      const wrappedError = new Error(`Error while processing endpoint spec: index=${indexSpec.name}, endpoint=${endptSpec.name}`);
      wrappedError.stack += `\n--- The above error was caused by the following error ---\n${err.stack}`;
      throw wrappedError;
    }
  }

  if (requireCheckBearerTokenMethod) {
    controllerClass.addMethod({
      name: 'checkBearerToken',
      scope: tsm.Scope.Protected,
      isAbstract: true,
      parameters: [{
        name: 'bearerToken',
        type: 'string'
      }],
      returnType: 'Promise<boolean>'
    });
  }

  imports.write(sourceFile);
};

const createControllerGlueFile = (
  project: tsm.Project,
  indexSpec: IndexSpec,
  endptSpecs: ReadonlyArray<EndpointSpec>
): tsm.SourceFile => {
  const sourceFile = project.createSourceFile(
    join(__dirname, `../src/controllers/glues/${pascalToKebabCase(indexSpec.name)}.ts`),
    '',
    { scriptKind: tsm.ScriptKind.TS, overwrite: true }
  );
  try {
    writeControllerGlueFile(sourceFile, indexSpec, endptSpecs);
  } catch (err) {
    const wrappedError = new Error(`Error while writing controller: index=${indexSpec.name}`);
    wrappedError.stack += `\n--- The above error was caused by the following error ---\n${err.stack}`;
    throw wrappedError;
  }
  return sourceFile;
};

export const createControllerGlueFiles = (
  project: tsm.Project,
  specs: ReadonlyArray<readonly [IndexSpec, ReadonlyArray<EndpointSpec>]>
): Array<tsm.SourceFile> =>
  specs.map(([indexSpec, endptSpecs]) =>
    createControllerGlueFile(project, indexSpec, endptSpecs));
