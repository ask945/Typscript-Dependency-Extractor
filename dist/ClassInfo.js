"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = extractClassInfo;
exports.parseClasses = parseClasses;
const ts_morph_1 = require("ts-morph");
function extractClassInfo(node) {
    const getName = () => {
        return node.getName() || "AnonymousClass";
    };
    const isExported = () => {
        return node.isExported() || node.isDefaultExport();
    };
    const methods = [];
    const properties = [];
    const extractMethods = () => {
        const classMethods = node.getMethods();
        classMethods.forEach(method => {
            const methodName = method.getName();
            const returnType = method.getReturnType();
            const params = [];
            method.getParameters().forEach(param => {
                const paramName = param.getName();
                const paramType = param.getType();
                const isOptional = param.isOptional();
                params.push({
                    name: paramName,
                    type: paramType ? paramType.getText() : "any",
                    isRequired: !isOptional
                });
            });
            methods.push({
                name: methodName,
                params: params,
                returnType: returnType ? returnType.getText() : "any"
            });
        });
    };
    const extractProperties = () => {
        const classProps = node.getProperties();
        classProps.forEach(prop => {
            const propName = prop.getName();
            const propType = prop.getType();
            const isOptional = prop.hasQuestionToken();
            properties.push({
                name: propName,
                type: propType ? propType.getText() : "any",
                isRequired: !isOptional
            });
        });
    };
    extractMethods();
    extractProperties();
    return {
        name: getName(),
        isExported: isExported(),
        methods: methods,
        properties: properties,
        usedInFiles: []
    };
}
function parseClasses(files) {
    const project = new ts_morph_1.Project();
    const allClasses = [];
    files.forEach((file) => {
        const sourceFile = project.addSourceFileAtPath(file);
        const fileClasses = [];
        sourceFile.getClasses().forEach((classDecl) => {
            const classInfo = extractClassInfo(classDecl);
            fileClasses.push(classInfo);
            classInfo.usedInFiles.push(file);
        });
        allClasses.push(...fileClasses);
    });
    files.forEach((file) => {
        const sourceFile = project.addSourceFileAtPath(file);
        allClasses.forEach(classInfo => {
            const className = classInfo.name;
            if (classInfo.usedInFiles.includes(file)) {
                return;
            }
            const usesClass = checkFileForClassUsage(sourceFile, className);
            if (usesClass && !classInfo.usedInFiles.includes(file)) {
                classInfo.usedInFiles.push(file);
            }
        });
    });
    return allClasses;
}
function checkFileForClassUsage(sourceFile, className) {
    let usesClass = false;
    sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.TypeReference).forEach(typeRef => {
        if (typeRef.getText() === className) {
            usesClass = true;
        }
    });
    sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.NewExpression).forEach(newExpr => {
        const expr = newExpr.getExpression();
        if (expr.getText() === className) {
            usesClass = true;
        }
    });
    sourceFile.getClasses().forEach(classDecl => {
        const heritage = classDecl.getHeritageClauses();
        heritage.forEach(clause => {
            const types = clause.getTypeNodes();
            types.forEach(type => {
                if (type.getText().includes(className)) {
                    usesClass = true;
                }
            });
        });
    });
    sourceFile.getVariableDeclarations().forEach(varDecl => {
        const typeNode = varDecl.getTypeNode();
        if (typeNode && typeNode.getText() === className) {
            usesClass = true;
        }
        const initializer = varDecl.getInitializer();
        if (initializer && initializer.getText().includes(className)) {
            usesClass = true;
        }
    });
    sourceFile.getImportDeclarations().forEach(importDecl => {
        const namedImports = importDecl.getNamedImports();
        namedImports.forEach(named => {
            if (named.getName() === className) {
                usesClass = true;
            }
        });
    });
    return usesClass;
}
