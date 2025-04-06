import { Project } from 'ts-morph';
import {
    FileAnalysis,
    ComponentInfo,
    FunctionInfo,
    InterfaceInfo,
    TypeInfo,
    ClassInfo,
    VariableInfo
} from './utils/tokens';
import extractComponentInfo from './ComponentInfo';
import extractFunctionInfo from './FunctionInfo';
import extractInterfaceInfo from './InterfaceInfo';
import extractTypeInfo from './TypeInfo';
import extractClassInfo from './ClassInfo';
import extractVariableInfo from './VariableInfo';
import extractImportInfo from './ImportInfo';
import * as path from 'path';

export default function parseFiles(files: string[]): FileAnalysis[] {
    const project = new Project();
    const sourceFiles = files.map(file => project.addSourceFileAtPath(file));
    const fileAnalyses: FileAnalysis[] = [];

    sourceFiles.forEach(sourceFile => {
        const filePath = sourceFile.getFilePath();
        const fileName = path.basename(filePath);
        const components: ComponentInfo[] = [];

        // Function components
        sourceFile.getFunctions().forEach(func => {
            const isComponent = func.getName()?.charAt(0)?.toUpperCase() === func.getName()?.charAt(0);
            if (isComponent) {
                components.push(extractComponentInfo(func, "function"));
            }
        });

        // Arrow function components
        sourceFile.getVariableDeclarations().forEach(varDecl => {
            const initializer = varDecl.getInitializer();
            const name = varDecl.getName();
            if (initializer && name.charAt(0).toUpperCase() === name.charAt(0)) {
                if (initializer.getKind() === 206) { // ArrowFunction kind
                    components.push(extractComponentInfo(varDecl, "arrow"));
                }
            }
        });

        // Class components & regular classes
        const classes: ClassInfo[] = [];
        sourceFile.getClasses().forEach(classDecl => {
            const isComponent = classDecl.getExtends()?.getText().includes('Component') || false;
            if (isComponent) {
                components.push(extractComponentInfo(classDecl, "class"));
            } else {
                classes.push(extractClassInfo(classDecl));
            }
        });

        // Regular functions (excluding components)
        const functions: FunctionInfo[] = [];
        sourceFile.getFunctions()
            .filter(func => !components.some(comp => comp.name === func.getName()))
            .forEach(func => {
                functions.push(extractFunctionInfo(func, "function"));
            });

        sourceFile.getVariableDeclarations().forEach(varDecl => {
            const initializer = varDecl.getInitializer();
            if (initializer && initializer.getKind() === 206 &&
                !components.some(comp => comp.name === varDecl.getName())) {
                functions.push(extractFunctionInfo(varDecl, "arrow"));
            }
        });

        const interfaces: InterfaceInfo[] = sourceFile.getInterfaces().map(interfaceDecl =>
            extractInterfaceInfo(interfaceDecl)
        );

        const types: TypeInfo[] = sourceFile.getTypeAliases().map(typeAlias =>
            extractTypeInfo(typeAlias)
        );

        const variables: VariableInfo[] = [];
        sourceFile.getVariableStatements().forEach(statement => {
            statement.getDeclarations().forEach(declaration => {
                const initializer = declaration.getInitializer();
                if (!initializer || initializer.getKind() !== 206) {
                    variables.push(extractVariableInfo(declaration, statement));
                }
            });
        });

        const imports = sourceFile.getImportDeclarations().map(importDecl =>
            extractImportInfo(importDecl, filePath)
        );

        fileAnalyses.push({
            fileName,
            filePath,
            exports: {
                components,
                functions,
                interfaces,
                types,
                classes,
                variables
            },
            imports,
            incomingDependencies: [],
            outgoingDependencies: []
        });
    });

    return fileAnalyses;
}
