import { ImportDeclaration, Project, SourceFile, SyntaxKind } from "ts-morph";
import { ImportInfo } from "./utils/tokens";
import * as path from "path";

export default function extractImportInfo(
  importDecl: ImportDeclaration,
  sourceFilePath: string
): ImportInfo {
  const moduleSpecifier = importDecl.getModuleSpecifierValue();
  const namedImports = importDecl.getNamedImports().map(namedImport => 
    namedImport.getName()
  );
  const defaultImport = importDecl.getDefaultImport()?.getText() || "";
  const isTypeOnly = importDecl.isTypeOnly();
  let resolvedFilePath: string | undefined = undefined;
  
  if (moduleSpecifier.startsWith(".") || moduleSpecifier.startsWith("/")) {
    try {
      const sourceDir = path.dirname(sourceFilePath);
      const extensions = ["", ".ts", ".tsx", ".js", ".jsx"];
      
      for (const ext of extensions) {
        const potentialPath = path.resolve(sourceDir, moduleSpecifier + ext);
        resolvedFilePath = potentialPath;
        break;
      }
    } catch (error) {
      console.error(`Failed to resolve path for ${moduleSpecifier}: ${error}`);
    }
  }

  const name = defaultImport || 
               (namedImports.length > 0 ? namedImports[0] : moduleSpecifier);
  
  return {
    name,
    path: moduleSpecifier,
    namedImports,
    defaultImport,
    isTypeOnly,
    resolvedFilePath
  };
}

export function parseImports(files: string[]) {
  const project = new Project();
  const allImports: ImportInfo[] = [];
  
  files.forEach((file) => {
    const sourceFile = project.addSourceFileAtPath(file);
    const fileImports: ImportInfo[] = [];
    sourceFile.getImportDeclarations().forEach(importDecl => {
      const importInfo = extractImportInfo(importDecl, file);
      fileImports.push(importInfo);
    });
    
    allImports.push(...fileImports);
  });
  
  return allImports;
}

export function analyzeProjectImports(files: string[]) {
  const project = new Project();
  const importMap = new Map<string, ImportInfo[]>();
  const sourceFiles = files.map(file => project.addSourceFileAtPath(file));

  sourceFiles.forEach(sourceFile => {
    const filePath = sourceFile.getFilePath();
    const fileImports: ImportInfo[] = [];

    sourceFile.getImportDeclarations().forEach(importDecl => {
      const importInfo = extractImportInfo(importDecl, filePath);
      fileImports.push(importInfo);
    });

    importMap.set(filePath, fileImports);
  });
  

  const findCircularDependencies = () => {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularDependencies: string[][] = [];
    
    const dfs = (currentPath: string, path: string[] = []) => {
      if (recursionStack.has(currentPath)) {
        const cycle = [...path.slice(path.indexOf(currentPath)), currentPath];
        circularDependencies.push(cycle);
        return;
      }
      
      if (visited.has(currentPath)) {
        return;
      }
      
      visited.add(currentPath);
      recursionStack.add(currentPath);
      
      const imports = importMap.get(currentPath) || [];
      for (const importInfo of imports) {
        if (importInfo.resolvedFilePath) {
          dfs(importInfo.resolvedFilePath, [...path, currentPath]);
        }
      }
      
      recursionStack.delete(currentPath);
    };
    
    sourceFiles.forEach(sourceFile => {
      dfs(sourceFile.getFilePath());
    });
    
    return circularDependencies;
  };
  
  return {
    imports: Array.from(importMap.values()).flat(),
    importMap,
    circularDependencies: findCircularDependencies()
  };
}