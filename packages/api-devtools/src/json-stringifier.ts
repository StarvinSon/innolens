import * as tsm from 'ts-morph';

import { Imports } from './imports';
import { Schema } from './schema';
import { VariableNameFactory } from './variable';


export const writeJsonEncoder = (
  sourceFile: tsm.SourceFile,
  writer: tsm.CodeBlockWriter,
  createVarName: VariableNameFactory,
  imports: Imports,
  setterExpr: string,
  getterExpr: string,
  schema: Schema,
  runtimeType: 'node' | 'web',
  addLambdaParamUnknownType: boolean = false
): void => {
  const srcVar = createVarName('src');
  writer.writeLine(`const ${srcVar} = ${getterExpr}`);

  const resultVar = createVarName('result');
  writer.writeLine(`let ${resultVar}`);

  if ('anyOf' in schema) {
    for (let i = 0; i < schema.anyOf.length; i += 1) {
      writer.write(`if (${resultVar} === undefined)`).block(() => {
        writeJsonEncoder(
          sourceFile, writer, createVarName, imports,
          resultVar, srcVar, schema.anyOf[i],
          runtimeType, addLambdaParamUnknownType
        );
      });
    }
  } else if ('enum' in schema) {
    for (let i = 0; i < schema.enum.length; i += 1) {
      writer.write(`if (${resultVar} === undefined)`).block(() => {
        const literal = schema.enum[i];

        writer.write(`if (${srcVar} === `);
        if (literal === null) {
          writer.write('null');
        } else {
          switch (typeof literal) {
            case 'boolean':
            case 'number': writer.write(String(literal)); break;
            case 'string': writer.quote(literal); break;
            default: throw new Error('enum can support boolean, number and string literal');
          }
        }
        writer.write(')').block(() => {
          const literalType = literal === null ? 'null' : typeof literal;
          switch (literalType) {
            case 'boolean':
            case 'number':
            case 'string':
            case 'null': {
              writeJsonEncoder(
                sourceFile, writer, createVarName, imports,
                resultVar, srcVar, { type: literalType },
                runtimeType
              );
              break;
            }
            default: throw new Error('enum can support boolean, number and string literal');
          }
        });
      });
    }
  } else {
    switch (schema.type) {
      case 'null': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-stringifier`, 'encodeJsonNull');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'boolean': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-stringifier`, 'encodeJsonBoolean');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'integer': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-stringifier`, 'encodeJsonInteger');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'number': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-stringifier`, 'encodeJsonNumber');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'string': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-stringifier`, 'encodeJsonString');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'date': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-stringifier`, 'encodeJsonDate');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'array': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-stringifier`, 'encodeJsonArray');
        const itemVar = createVarName('item');
        writer.write(`${resultVar} = ${encodeFunc}(${srcVar}, `);
        if ((Array.isArray as (val: unknown) => val is ReadonlyArray<any>)(schema.items)) {
          writer.write('[').newLine();
          for (const subSchema of schema.items) {
            writer.write(`(${itemVar}${addLambdaParamUnknownType ? ': unknown' : ''}) => `).inlineBlock(() => {
              const encodedItemVar = createVarName('encodedItem');
              writer.writeLine(`let ${encodedItemVar}`);
              writeJsonEncoder(
                sourceFile, writer, createVarName, imports,
                encodedItemVar, itemVar, subSchema,
                runtimeType, addLambdaParamUnknownType
              );
              writer.writeLine(`return ${encodedItemVar}`);
            });
            writer.write(',').newLine();
          }
          writer.write(']');
        } else {
          writer.write(`(${itemVar}${addLambdaParamUnknownType ? ': unknown' : ''}) => `).inlineBlock(() => {
            const encodedItemVar = createVarName('encodedItem');
            writer.writeLine(`let ${encodedItemVar}`);
            writeJsonEncoder(
              sourceFile, writer, createVarName, imports,
              encodedItemVar, itemVar, schema.items as Schema,
              runtimeType, addLambdaParamUnknownType
            );
            writer.writeLine(`return ${encodedItemVar}`);
          });
        }
        writer.write(')').newLine();
        break;
      }
      case 'object': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-stringifier`, 'encodeJsonObject');

        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar}, `);

        // Required Properties
        writer.write('[');
        if (schema.required !== undefined) {
          for (const requiredKey of schema.required) {
            writer.quote(requiredKey).write(', ');
          }
        }
        writer.write('], ');

        // Properties
        writer.inlineBlock(() => {
          if (schema.properties !== undefined) {
            for (const [key, itemSchema] of Object.entries(schema.properties)) {
              const itemVar = createVarName('item');
              writer.write(`${key}: (${itemVar}${addLambdaParamUnknownType ? ': unknown' : ''}) => `).inlineBlock(() => {
                const encodedItemVar = createVarName('encodedItem');
                writer.writeLine(`let ${encodedItemVar}`);
                writeJsonEncoder(
                  sourceFile, writer, createVarName, imports,
                  encodedItemVar, itemVar, itemSchema,
                  runtimeType, addLambdaParamUnknownType
                );
                writer.writeLine(`return ${encodedItemVar}`);
              }).write(',').newLine();
            }
          }
        }).write(', ');

        // Additional Properties
        if (schema.additionalProperties !== false) {
          const itemVar = createVarName('item');
          writer.write(`(${itemVar}${addLambdaParamUnknownType ? ': unknown' : ''}) => `).inlineBlock(() => {
            const encodedItemVar = createVarName('encodedItem');
            writer.writeLine(`let ${encodedItemVar}`);
            writeJsonEncoder(
              sourceFile, writer, createVarName, imports,
              encodedItemVar, itemVar, schema.additionalProperties as Schema,
              runtimeType, addLambdaParamUnknownType
            );
            writer.writeLine(`return ${encodedItemVar}`);
          });
        }

        writer.write(')').newLine();
        break;
      }
      default: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _: never = schema;
        throw new Error(`Unsupported schema: ${JSON.stringify(schema)}`);
      }
    }
  }

  writer.writeLine(`${setterExpr} = ${resultVar}`);
};


export const writeJsonStringifier = (
  sourceFile: tsm.SourceFile,
  writer: tsm.CodeBlockWriter,
  createVarName: VariableNameFactory,
  imports: Imports,
  setterExpr: string,
  getterExpr: string,
  schema: Schema,
  runtimeType: 'node' | 'web',
  addLambdaParamUnknownType = false
): void => {
  const encodedVar = createVarName('encoded');
  writer.writeLine(`let ${encodedVar}`);
  writeJsonEncoder(
    sourceFile, writer, createVarName, imports,
    encodedVar, getterExpr, schema,
    runtimeType, addLambdaParamUnknownType
  );
  writer.writeLine(`${setterExpr} = ${encodedVar} === undefined ? undefined : JSON.stringify(${encodedVar})`);
};
