import * as tsm from 'ts-morph';

import { Imports } from './imports';


export type Schema = {
  readonly type: 'null' | 'boolean' | 'integer' | 'number' | 'string' | 'date';
} | {
  readonly enum: ReadonlyArray<string | number | boolean>;
} | {
  readonly type: 'array';
  readonly items: Schema | ReadonlyArray<Schema>;
} | {
  readonly type: 'object';
  readonly required?: ReadonlyArray<string>;
  readonly additionalProperties: false | Schema;
  readonly properties?: {
    readonly [key: string]: Schema;
  }
} | {
  readonly anyOf: ReadonlyArray<Schema>;
};


export const writeSchemaType = (
  sourceFile: tsm.SourceFile,
  writer: tsm.CodeBlockWriter,
  imports: Imports,
  schema: Schema
): void => {
  if ('anyOf' in schema) {
    for (let i = 0; i < schema.anyOf.length; i += 1) {
      if (i > 0) writer.write(' | ');
      writeSchemaType(
        sourceFile, writer, imports,
        schema.anyOf[i]
      );
    }
    return;
  }
  if ('enum' in schema) {
    for (let i = 0; i < schema.enum.length; i += 1) {
      if (i > 0) writer.write(' | ');
      const literal = schema.enum[i];
      switch (typeof literal) {
        case 'boolean':
        case 'number': writer.write(String(literal)); break;
        case 'string': writer.quote(literal); break;
        default: throw new Error('Enum only support boolean, number and string literal');
      }
    }
    writer.newLine();
    return;
  }
  switch (schema.type) {
    case 'null': {
      writer.write('null');
      break;
    }
    case 'boolean': {
      writer.write('boolean');
      break;
    }
    case 'integer':
    case 'number': {
      writer.write('number');
      break;
    }
    case 'string': {
      writer.write('string');
      break;
    }
    case 'date': {
      writer.write('Date');
      break;
    }
    case 'array': {
      if ((Array.isArray as (val: unknown) => val is ReadonlyArray<any>)(schema.items)) {
        writer.write('readonly [');
        for (const subSchema of schema.items) {
          writeSchemaType(
            sourceFile, writer, imports,
            subSchema
          );
          writer.write(', ');
        }
        writer.write(']');
      } else {
        writer.write('ReadonlyArray<');
        writeSchemaType(
          sourceFile, writer, imports,
          schema.items
        );
        writer.write('>');
      }
      break;
    }
    case 'object': {
      writer.inlineBlock(() => {
        if (schema.properties !== undefined) {
          for (const [key, valSchema] of Object.entries(schema.properties)) {
            writer.write(`readonly ${key}: `);
            writeSchemaType(
              sourceFile, writer, imports,
              valSchema
            );
            writer.newLine();
          }
        }
        if (schema.additionalProperties !== false) {
          writer.write('readonly [key: string]: ');
          writeSchemaType(
            sourceFile, writer, imports,
            schema.additionalProperties
          );
          writer.newLine();
        }
      });
      break;
    }
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _: never = schema;
      throw new Error(`Unsupported schema: ${JSON.stringify(schema)}`);
    }
  }
};
