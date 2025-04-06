"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = extractInterfaceInfo;
exports.parseInterfaces = parseInterfaces;
const ts_morph_1 = require("ts-morph");
function extractInterfaceInfo(node) {
    const getName = () => {
        return node.getName() || "AnonymousInterface";
    };
    const isExported = () => {
        return node.isExported() || node.isDefaultExport();
    };
    const properties = [];
    const extractProperties = () => {
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
function parseInterfaces(files) {
    const project = new ts_morph_1.Project();
    const allInterfaces = [];
    files.forEach((file) => {
        const sourceFile = project.addSourceFileAtPath(file);
        const fileInterfaces = [];
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
function checkFileForInterfaceUsage(sourceFile, interfaceName) {
    let usesInterface = false;
    sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.TypeReference).forEach(typeRef => {
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
    sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.Parameter).forEach(param => {
        const typeNode = param.getTypeNode();
        if (typeNode && typeNode.getText() === interfaceName) {
            usesInterface = true;
        }
    });
    sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.PropertyDeclaration).forEach(prop => {
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
