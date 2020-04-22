import * as tsm from 'ts-morph';

import { Imports } from './imports';
import { Schema } from './schema';
import { VariableNameFactory } from './variable';


export const writeQueryEncoder = (
  sourceFile: tsm.SourceFile,
  writer: tsm.CodeBlockWriter,
  createVarName: VariableNameFactory,
  imports: Imports,
  setterExpr: string,
  getterExpr: string,
  schema: Schema,
  runtimeType: 'web' | 'node'
): void => {
  const tempSrcVar = createVarName('tempSrc');
  const tempTargetVar = createVarName('tempTarget');
  writer.writeLine(`let ${tempSrcVar} = ${getterExpr}`);
  writer.writeLine(`let ${tempTargetVar}`);

  if ('anyOf' in schema) {
    for (let i = 0; i < schema.anyOf.length; i += 1) {
      writer.write(`if (${tempTargetVar} === undefined)`).block(() => {
        writeQueryEncoder(
          sourceFile, writer, createVarName, imports,
          tempTargetVar, tempSrcVar, schema.anyOf[i],
          runtimeType
        );
      });
    }
  } else if ('enum' in schema) {
    writer.write('if (false');
    for (let i = 0; i < schema.enum.length; i += 1) {
      writer.write(` || ${tempSrcVar} === ${JSON.stringify(schema.enum[i])}`);
    }
    writer.write(')').block(() => {
      writer.writeLine(`${tempTargetVar} = ${tempSrcVar}`);
    });
  } else {
    switch (schema.type) {
      case 'null': {
        const stringifyMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-stringifier`, 'encodeQueryNull');
        writer.writeLine(`${tempTargetVar} = ${stringifyMethod}(${tempSrcVar})`);
        break;
      }
      case 'boolean': {
        const stringifyMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-stringifier`, 'encodeQueryBoolean');
        writer.writeLine(`${tempTargetVar} = ${stringifyMethod}(${tempSrcVar})`);
        break;
      }
      case 'integer': {
        const stringifyMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-stringifier`, 'encodeQueryInteger');
        writer.writeLine(`${tempTargetVar} = ${stringifyMethod}(${tempSrcVar})`);
        break;
      }
      case 'number': {
        const stringifyMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-stringifier`, 'encodeQueryNumber');
        writer.writeLine(`${tempTargetVar} = ${stringifyMethod}(${tempSrcVar})`);
        break;
      }
      case 'string': {
        const stringifyMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-stringifier`, 'encodeQueryString');
        writer.writeLine(`${tempTargetVar} = ${stringifyMethod}(${tempSrcVar})`);
        break;
      }
      case 'date': {
        const stringifyMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-stringifier`, 'encodeQueryDate');
        writer.writeLine(`${tempTargetVar} = ${stringifyMethod}(${tempSrcVar})`);
        break;
      }
      case 'array': {
        const stringifyMethod = imports.addNamedImport(`@innolens/api/runtime/${runtimeType}/query-stringifier`, 'encodeQueryArray');

        const itemStrVar = createVarName('itemStr');
        writer.write(`${tempTargetVar} = ${stringifyMethod}(${tempSrcVar}, `);
        if ((Array.isArray as (val: unknown) => val is ReadonlyArray<unknown>)(schema.items)) {
          writer.write('[').newLine();
          for (const subSchema of schema.items) {
            writer.write(`(${itemStrVar}) =>`).inlineBlock(() => {
              const encodedItemVar = createVarName('encodedItem');
              writer.writeLine(`let ${encodedItemVar}`);
              writeQueryEncoder(
                sourceFile, writer, createVarName, imports,
                encodedItemVar, itemStrVar, subSchema,
                runtimeType
              );
              writer.writeLine(`return ${encodedItemVar}`);
            }).write(',');
          }
          writer.write(']');
        } else {
          writer.write(`(${itemStrVar}) =>`).inlineBlock(() => {
            const encodedItemVar = createVarName('encodedItem');
            writer.writeLine(`let ${encodedItemVar}`);
            writeQueryEncoder(
              sourceFile, writer, createVarName, imports,
              encodedItemVar, itemStrVar, schema.items as Schema,
              runtimeType
            );
            writer.writeLine(`return ${encodedItemVar}`);
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
