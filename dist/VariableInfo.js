"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = extractVariableInfo;
exports.parseVariables = parseVariables;
const ts_morph_1 = require("ts-morph");
function extractVariableInfo(node, statement) {
    const getName = () => {
        return node.getName();
    };
    const isExported = () => {
        return statement.isExported() || statement.isDefaultExport();
    };
    const getType = () => {
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
function parseVariables(files) {
    const project = new ts_morph_1.Project();
    const allVariables = [];
    files.forEach((file) => {
        const sourceFile = project.addSourceFileAtPath(file);
        const fileVariables = [];
        sourceFile.getVariableStatements().forEach((statement) => {
            statement.getDeclarations().forEach((declaration) => {
                const initializer = declaration.getInitializer();
                if (initializer && ts_morph_1.Node.isArrowFunction(initializer)) {
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
        sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.Identifier).forEach((identifier) => {
            const name = identifier.getText();
            const matchingVariable = allVariables.find(variable => variable.name === name);
            if (matchingVariable) {
                const parent = identifier.getParent();
                if (parent &&
                    (!ts_morph_1.Node.isVariableDeclaration(parent) || parent.getName() !== name) &&
                    !ts_morph_1.Node.isExportSpecifier(parent)) {
                    if (!matchingVariable.usedInFiles.includes(file)) {
                        matchingVariable.usedInFiles.push(file);
                    }
                }
            }
        });
    });
    return allVariables;
}
