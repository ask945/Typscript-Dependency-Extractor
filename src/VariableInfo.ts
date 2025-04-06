import { VariableDeclaration, Node, Project, SourceFile, SyntaxKind, VariableStatement } from "ts-morph";
import { VariableInfo } from "./utils/tokens";

export default function extractVariableInfo(
  node: VariableDeclaration,
  statement: VariableStatement
): VariableInfo {
  const getName = (): string => {
    return node.getName();
  };

  const isExported = (): boolean => {
    return statement.isExported() || statement.isDefaultExport();
  };

  const getType = (): string => {
    const typeNode = node.getTypeNode();
    if (typeNode) {
      return typeNode.getText();
    }
    const type = node.getType();
    return type ? type.getText() : "any";
  };

  return {
    name: getName(),
    isExported: isExported(),
    type: getType(),
    usedInFiles: []
  };
}

export function parseVariables(files: string[]) {
  const project = new Project();
  const allVariables: VariableInfo[] = [];

  files.forEach((file) => {
    const sourceFile = project.addSourceFileAtPath(file);
    const fileVariables: VariableInfo[] = [];

    sourceFile.getVariableStatements().forEach((statement) => {
      statement.getDeclarations().forEach((declaration) => {
        const initializer = declaration.getInitializer();
        if (initializer && Node.isArrowFunction(initializer)) {
          return;
        }
        
        const variableInfo = extractVariableInfo(declaration, statement);
        fileVariables.push(variableInfo);
        variableInfo.usedInFiles.push(file);
      });
    });
    
    allVariables.push(...fileVariables);
  });

  files.forEach((file) => {
    const sourceFile = project.addSourceFileAtPath(file);
    sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).forEach((identifier) => {
      const name = identifier.getText();
      const matchingVariable = allVariables.find(variable => variable.name === name);
      
      if (matchingVariable) {
        const parent = identifier.getParent();
        if (parent && 
            (!Node.isVariableDeclaration(parent) || parent.getName() !== name) && 
            !Node.isExportSpecifier(parent)) {
          if (!matchingVariable.usedInFiles.includes(file)) {
            matchingVariable.usedInFiles.push(file);
          }
        }
      }
    });
  });
  
  return allVariables;
}