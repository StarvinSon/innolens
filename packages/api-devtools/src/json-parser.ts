import * as tsm from 'ts-morph';

import { Imports } from './imports';
import { Schema } from './schema';
import { VariableNameFactory } from './variable';


export const writeJsonDecoder = (
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
        writeJsonDecoder(
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

        const literalVar = createVarName('literalVal');
        writer.writeLine(`let ${literalVar}`);

        const literalType = literal === null ? 'null' : typeof literal;
        switch (literalType) {
          case 'boolean':
          case 'number':
          case 'string':
          case 'null': {
            writeJsonDecoder(
              sourceFile, writer, createVarName, imports,
              literalVar, srcVar, { type: literalType },
              runtimeType
            );
            break;
          }
          default: throw new Error('enum can support boolean, number and string literal');
        }

        writer.write(`if (${literalVar} !== undefined && ${literalVar} === `);
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
          writer.writeLine(`${resultVar} = ${literalVar}`);
        });
      });
    }
  } else {
    switch (schema.type) {
      case 'null': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-parser`, 'decodeJsonNull');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'boolean': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-parser`, 'decodeJsonBoolean');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'integer': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-parser`, 'decodeJsonInteger');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'number': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-parser`, 'decodeJsonNumber');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'string': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-parser`, 'decodeJsonString');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'date': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-parser`, 'decodeJsonDate');
        writer.writeLine(`${resultVar} = ${encodeFunc}(${srcVar})`);
        break;
      }
      case 'array': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-parser`, 'decodeJsonArray');
        const itemVar = createVarName('item');
        writer.write(`${resultVar} = ${encodeFunc}(${srcVar}, `);
        if ((Array.isArray as (val: unknown) => val is ReadonlyArray<any>)(schema.items)) {
          writer.write('[').newLine();
          for (const subSchema of schema.items) {
            writer.writeLine(`(${itemVar}${addLambdaParamUnknownType ? ': unknown' : ''}) => `).inlineBlock(() => {
              const decodedItemVar = createVarName('decodedItem');
              writer.writeLine(`let ${decodedItemVar}`);
              writeJsonDecoder(
                sourceFile, writer, createVarName, imports,
                decodedItemVar, itemVar, subSchema,
                runtimeType, addLambdaParamUnknownType
              );
              writer.writeLine(`return ${decodedItemVar}`);
            }).write(',').newLine();
          }
          writer.write('] as const');
        } else {
          writer.writeLine(`(${itemVar}${addLambdaParamUnknownType ? ': unknown' : ''}) => `).inlineBlock(() => {
            const decodedItemVar = createVarName('decodedItem');
            writer.writeLine(`let ${decodedItemVar}`);
            writeJsonDecoder(
              sourceFile, writer, createVarName, imports,
              decodedItemVar, itemVar, schema.items as Schema,
              runtimeType, addLambdaParamUnknownType
            );
            writer.writeLine(`return ${decodedItemVar}`);
          }).write(',').newLine();
        }
        writer.write(')').newLine();
        break;
      }
      case 'object': {
        const encodeFunc = imports.addNamedImport(`@innolens/api-runtime/lib-${runtimeType}/json-parser`, 'decodeJsonObject');

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
                const decodedItemVar = createVarName('decodedItem');
                writer.writeLine(`let ${decodedItemVar}`);
                writeJsonDecoder(
                  sourceFile, writer, createVarName, imports,
                  decodedItemVar, itemVar, itemSchema,
                  runtimeType, addLambdaParamUnknownType
                );
                writer.writeLine(`return ${decodedItemVar}`);
              }).write(',').newLine();
            }
          }
        }).write(', ');

        // Additional Properties
        if (schema.additionalProperties !== false) {
          const itemVar = createVarName('item');
          writer.write(`(${itemVar}${addLambdaParamUnknownType ? ': unknown' : ''}) => `).inlineBlock(() => {
            const decodedItemVar = createVarName('decodedItem');
            writer.writeLine(`let ${decodedItemVar}`);
            writeJsonDecoder(
              sourceFile, writer, createVarName, imports,
              decodedItemVar, itemVar, schema.additionalProperties as Schema,
              runtimeType, addLambdaParamUnknownType
            );
            writer.writeLine(`return ${decodedItemVar}`);
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


export const writeJsonParser = (
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
  writer.writeLine(`const ${encodedVar} = JSON.parse(${getterExpr})`);

  const decodedVar = createVarName('decoded');
  writer.writeLine(`let ${decodedVar}`);

  writeJsonDecoder(
    sourceFile, writer, createVarName, imports,
    decodedVar, encodedVar, schema,
    runtimeType, addLambdaParamUnknownType
  );

  writer.writeLine(`${setterExpr} = ${decodedVar}`);
};
