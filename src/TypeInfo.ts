import { TypeAliasDeclaration, Node, Project, SourceFile, SyntaxKind } from "ts-morph";
import { TypeInfo } from "./utils/tokens";

export default function extractTypeInfo(
  node: TypeAliasDeclaration
): TypeInfo {
  const getName = (): string => {
    return node.getName() || "AnonymousType";
  };

  const isExported = (): boolean => {
    return node.isExported() || node.isDefaultExport();
  };

  const getType = (): string => {
    const typeNode = node.getTypeNode();
    return typeNode ? typeNode.getText() : "unknown";
  };

  return {
    name: getName(),
    isExported: isExported(),
    type: getType(),
    usedInFiles: []
  };
}

export function parseTypes(files: string[]) {
  const project = new Project();
  const allTypes: TypeInfo[] = [];
  files.forEach((file) => {
    const sourceFile = project.addSourceFileAtPath(file);
    const fileTypes: TypeInfo[] = [];

    sourceFile.getTypeAliases().forEach((typeAlias) => {
      const typeInfo = extractTypeInfo(typeAlias);
      fileTypes.push(typeInfo);
      typeInfo.usedInFiles.push(file);
    });
    
    allTypes.push(...fileTypes);
  });
  files.forEach((file) => {
    const sourceFile = project.addSourceFileAtPath(file);
    allTypes.forEach(typeInfo => {
      const typeName = typeInfo.name;
      if (typeInfo.usedInFiles.includes(file)) {
        return;
      }
      const usesType = checkFileForTypeUsage(sourceFile, typeName);
      
      if (usesType && !typeInfo.usedInFiles.includes(file)) {
        typeInfo.usedInFiles.push(file);
      }
    });
  });
  
  return allTypes;
}

function checkFileForTypeUsage(sourceFile: SourceFile, typeName: string): boolean {
  let usesType = false;
  sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference).forEach(typeRef => {
    if (typeRef.getText() === typeName) {
      usesType = true;
    }
  });
  sourceFile.getVariableDeclarations().forEach(varDecl => {
    const typeNode = varDecl.getTypeNode();
    if (typeNode && typeNode.getText().includes(typeName)) {
      usesType = true;
    }
  });

  sourceFile.getDescendantsOfKind(SyntaxKind.Parameter).forEach(param => {
    const typeNode = param.getTypeNode();
    if (typeNode && typeNode.getText().includes(typeName)) {
      usesType = true;
    }
  });

  sourceFile.getDescendantsOfKind(SyntaxKind.PropertyDeclaration).forEach(prop => {
    const typeNode = prop.getTypeNode();
    if (typeNode && typeNode.getText().includes(typeName)) {
      usesType = true;
    }
  });
  
  sourceFile.getFunctions().forEach(func => {
    const returnTypeNode = func.getReturnTypeNode();
    if (returnTypeNode && returnTypeNode.getText().includes(typeName)) {
      usesType = true;
    }
  });

  sourceFile.getTypeAliases().forEach(typeAlias => {
    const typeNode = typeAlias.getTypeNode();
    if (typeNode && typeNode.getText().includes(typeName)) {
      usesType = true;
    }
  });
  
  return usesType;
}