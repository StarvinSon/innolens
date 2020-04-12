import { join } from 'path';

import { getAllSpecs } from '@innolens/api/tools';
import * as tsm from 'ts-morph';

import { createControllerGlueFiles } from './controller-glue-generator';
import { createRoutesGlueFile } from './routes-glue-generator';


const main = async (): Promise<void> => {
  const specs = await getAllSpecs();

  const project = new tsm.Project({
    tsConfigFilePath: join(__dirname, '../tsconfig.json'),
    manipulationSettings: {
      indentationText: tsm.IndentationText.TwoSpaces,
      quoteKind: tsm.QuoteKind.Single,
      useTrailingCommas: false
    }
  });

  const generateSourceFiles: Array<tsm.SourceFile> = [];
  generateSourceFiles.push(...createControllerGlueFiles(project, specs));
  generateSourceFiles.push(createRoutesGlueFile(project, specs));

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
