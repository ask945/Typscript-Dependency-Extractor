import { InterfaceDeclaration, Node, Symbol, Project, SourceFile, SyntaxKind } from "ts-morph";
import { InterfaceInfo, PropertyInfo } from "./utils/tokens";

export default function extractInterfaceInfo(
  node: InterfaceDeclaration
): InterfaceInfo {
  const getName = (): string => {
    return node.getName() || "AnonymousInterface";
  };

  const isExported = (): boolean => {
    return node.isExported() || node.isDefaultExport();
  };

  const properties: PropertyInfo[] = [];
  const extractProperties = (): void => {
    const members = node.getProperties();
    
    members.forEach(property => {
      const propertyName = property.getName();
      const propertyType = property.getType();
      const isOptional = property.hasQuestionToken();
      
      properties.push({
        name: propertyName,
        type: propertyType ? propertyType.getText() : "any",
        isRequired: !isOptional
      });
    });
  };

  extractProperties();

  return {
    name: getName(),
    isExported: isExported(),
    properties: properties,
    usedInFiles: []
  };
}
export function parseInterfaces(files: string[]) {
  const project = new Project();
  const allInterfaces: InterfaceInfo[] = [];
  files.forEach((file) => {
    const sourceFile = project.addSourceFileAtPath(file);
    const fileInterfaces: InterfaceInfo[] = [];
    sourceFile.getInterfaces().forEach((interfaceDecl) => {
      const interfaceInfo = extractInterfaceInfo(interfaceDecl);
      fileInterfaces.push(interfaceInfo);
      interfaceInfo.usedInFiles.push(file);
    });
    
    allInterfaces.push(...fileInterfaces);
  });
  files.forEach((file) => {
    const sourceFile = project.addSourceFileAtPath(file);
    allInterfaces.forEach(interfaceInfo => {
      const interfaceName = interfaceInfo.name;
      if (interfaceInfo.usedInFiles.includes(file)) {
        return;
      }
      const usesInterface = checkFileForInterfaceUsage(sourceFile, interfaceName);
      
      if (usesInterface && !interfaceInfo.usedInFiles.includes(file)) {
        interfaceInfo.usedInFiles.push(file);
      }
    });
  });
  
  return allInterfaces;
}

function checkFileForInterfaceUsage(sourceFile: SourceFile, interfaceName: string): boolean {
  let usesInterface = false;
  sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference).forEach(typeRef => {
    if (typeRef.getText() === interfaceName) {
      usesInterface = true;
    }
  });
  sourceFile.getVariableDeclarations().forEach(varDecl => {
    const typeNode = varDecl.getTypeNode();
    if (typeNode && typeNode.getText() === interfaceName) {
      usesInterface = true;
    }
  });
  sourceFile.getDescendantsOfKind(SyntaxKind.Parameter).forEach(param => {
    const typeNode = param.getTypeNode();
    if (typeNode && typeNode.getText() === interfaceName) {
      usesInterface = true;
    }
  });
  sourceFile.getDescendantsOfKind(SyntaxKind.PropertyDeclaration).forEach(prop => {
    const typeNode = prop.getTypeNode();
    if (typeNode && typeNode.getText() === interfaceName) {
      usesInterface = true;
    }
  });
  sourceFile.getFunctions().forEach(func => {
    const returnTypeNode = func.getReturnTypeNode();
    if (returnTypeNode && returnTypeNode.getText() === interfaceName) {
      usesInterface = true;
    }
  });
  
  return usesInterface;
}