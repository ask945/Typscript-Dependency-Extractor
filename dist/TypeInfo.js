"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = extractTypeInfo;
exports.parseTypes = parseTypes;
const ts_morph_1 = require("ts-morph");
function extractTypeInfo(node) {
    const getName = () => {
        return node.getName() || "AnonymousType";
    };
    const isExported = () => {
        return node.isExported() || node.isDefaultExport();
    };
    const getType = () => {
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
function parseTypes(files) {
    const project = new ts_morph_1.Project();
    const allTypes = [];
    files.forEach((file) => {
        const sourceFile = project.addSourceFileAtPath(file);
        const fileTypes = [];
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
function checkFileForTypeUsage(sourceFile, typeName) {
    let usesType = false;
    sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.TypeReference).forEach(typeRef => {
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
    sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.Parameter).forEach(param => {
        const typeNode = param.getTypeNode();
        if (typeNode && typeNode.getText().includes(typeName)) {
            usesType = true;
        }
    });
    sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.PropertyDeclaration).forEach(prop => {
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
