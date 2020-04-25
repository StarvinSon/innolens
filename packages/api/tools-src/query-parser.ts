import * as tsm from 'ts-morph';

import { Imports } from './imports';
import { Schema } from './schema';
import { VariableNameFactory } from './variable';


export const writeQueryDecoder = (
  sourceFile: tsm.SourceFile,
  writer: tsm.CodeBlockWriter,
  createVarName: VariableNameFactory,
  imports: Imports,
  setterExpr: string,
  getterExpr: string,
  schema: Schema,
  runtimeType: 'node' | 'web'
): void => {
  const tempSrcVar = createVarName('tempSrcReslt');
  const tempTargetVar = createVarName('tempTargetResult');
  writer.writeLine(`let ${tempSrcVar} = ${getterExpr}`);
  writer.writeLine(`let ${tempTargetVar}`);

  if ('anyOf' in schema) {
    for (let i = 0; i < schema.anyOf.length; i += 1) {
      writer.write(`if (${tempTargetVar} === undefined)`).block(() => {
        writeQueryDecoder(
          sourceFile, writer, createVarName, imports,
          setterExpr, tempSrcVar, schema.anyOf[i],
          runtimeType
        );
      });
    }
  } else if ('enum' in schema) {
    for (let i = 0; i < schema.enum.length; i += 1) {
      writer.write(`if (${tempTargetVar} === undefined)`).block(() => {
        const literal = schema.enum[i];

        const literalVar = createVarName('literalVal');
        writer.writeLine(`let ${literalVar}`);

        const literalType = typeof literal;
        switch (literalType) {
          case 'boolean':
          case 'number':
          case 'string': {
            writeQueryDecoder(
              sourceFile, writer, createVarName, imports,
              literalVar, tempSrcVar, { type: literalType },
              runtimeType
            );
            break;
          }
          default: throw new Error('enum can support boolean, number and string literal');
        }

        writer.write(`if (${literalVar} !== undefined && ${literalVar} === `);
        switch (typeof literal) {
          case 'boolean':
          case 'number': writer.write(String(literal)); break;
          case 'string': writer.quote(literal); break;
          default: throw new Error('enum can support boolean, number and string literal');
        }
        writer.write(')').block(() => {
          writer.writeLine(`${tempTargetVar} = ${literalVar}`);
        });
      });
    }
  } else {
    switch (schema.type) {
      case 'null': {
        const parseMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-parser`, 'decodeQueryNull');
        writer.writeLine(`${tempTargetVar} = ${parseMethod}(${tempSrcVar})`);
        break;
      }
      case 'boolean': {
        const parseMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-parser`, 'decodeQueryBoolean');
        writer.writeLine(`${tempTargetVar} = ${parseMethod}(${tempSrcVar})`);
        break;
      }
      case 'integer': {
        const parseMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-parser`, 'decodeQueryInteger');
        writer.writeLine(`${tempTargetVar} = ${parseMethod}(${tempSrcVar})`);
        break;
      }
      case 'number': {
        const parseMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-parser`, 'decodeQueryNumber');
        writer.writeLine(`${tempTargetVar} = ${parseMethod}(${tempSrcVar})`);
        break;
      }
      case 'string': {
        const parseMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-parser`, 'decodeQueryString');
        writer.writeLine(`${tempTargetVar} = ${parseMethod}(${tempSrcVar})`);
        break;
      }
      case 'date': {
        const parseMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-parser`, 'decodeQueryDate');
        writer.writeLine(`${tempTargetVar} = ${parseMethod}(${tempSrcVar})`);
        break;
      }
      case 'array': {
        const parseMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-parser`, 'decodeQueryArray');
        const itemStrVar = createVarName('itemStr');
        writer.write(`${tempTargetVar} = ${parseMethod}(${tempSrcVar}, `);
        if ((Array.isArray as (val: unknown) => val is ReadonlyArray<unknown>)(schema.items)) {
          writer.write('[').newLine();
          for (const subSchema of schema.items) {
            writer.write(`(${itemStrVar}) =>`).inlineBlock(() => {
              const decodedItemVar = createVarName('decodedItem');
              writer.writeLine(`let ${decodedItemVar}`);
              writeQueryDecoder(
                sourceFile, writer, createVarName, imports,
                decodedItemVar, itemStrVar, subSchema,
                runtimeType
              );
              writer.writeLine(`return ${decodedItemVar}`);
            }).write(',');
          }
          writer.write('] as const');
        } else {
          writer.write(`(${itemStrVar}) =>`).inlineBlock(() => {
            const decodedItemVar = createVarName('decodedItem');
            writer.writeLine(`let ${decodedItemVar}`);
            writeQueryDecoder(
              sourceFile, writer, createVarName, imports,
              decodedItemVar, itemStrVar, schema.items as Schema,
              runtimeType
            );
            writer.writeLine(`return ${decodedItemVar}`);
          });
        }
        writer.write(')');
        break;
      }
      case 'object': {
        throw new Error('query does not support object type yet');
      }
      default: {
        throw new Error(`Unsupported schema: ${JSON.stringify(schema)}`);
      }
    }
  }
  writer.writeLine(`${setterExpr} = ${tempTargetVar}`);
};
