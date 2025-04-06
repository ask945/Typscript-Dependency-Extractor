"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = extractFunctionInfo;
const ts_morph_1 = require("ts-morph");
function extractFunctionInfo(node, type) {
    const getName = () => {
        if (ts_morph_1.Node.isFunctionDeclaration(node)) {
            return node.getName() || "AnonymousFunction";
        }
        else if (ts_morph_1.Node.isVariableDeclaration(node)) {
            return node.getName();
        }
        else if (ts_morph_1.Node.isArrowFunction(node)) {
            const parent = node.getParent();
            if (parent && ts_morph_1.Node.isVariableDeclaration(parent)) {
                return parent.getName();
            }
            return "AnonymousArrowFunction";
        }
        return "AnonymousFunction";
    };
    const isExported = () => {
        var _a, _b;
        if (ts_morph_1.Node.isFunctionDeclaration(node)) {
            return node.isExported() || node.isDefaultExport();
        }
        else if (ts_morph_1.Node.isVariableDeclaration(node)) {
            const statement = (_a = node.getParent()) === null || _a === void 0 ? void 0 : _a.getParent();
            if (statement && ts_morph_1.Node.isVariableStatement(statement)) {
                return statement.isExported() || statement.isDefaultExport();
            }
        }
        else if (ts_morph_1.Node.isArrowFunction(node)) {
            const parent = node.getParent();
            if (parent && ts_morph_1.Node.isVariableDeclaration(parent)) {
                const statement = (_b = parent.getParent()) === null || _b === void 0 ? void 0 : _b.getParent();
                if (statement && ts_morph_1.Node.isVariableStatement(statement)) {
                    return statement.isExported() || statement.isDefaultExport();
                }
            }
        }
        return false;
    };
    const getReturnType = () => {
        if (ts_morph_1.Node.isFunctionDeclaration(node)) {
            const returnType = node.getReturnType();
            return returnType ? returnType.getText() : "any";
        }
        else if (ts_morph_1.Node.isArrowFunction(node)) {
            const returnType = node.getReturnType();
            return returnType ? returnType.getText() : "any";
        }
        else if (ts_morph_1.Node.isVariableDeclaration(node)) {
            const initializer = node.getInitializer();
            if (initializer && ts_morph_1.Node.isArrowFunction(initializer)) {
                const returnType = initializer.getReturnType();
                return returnType ? returnType.getText() : "any";
            }
        }
        return "any";
    };
    const params = [];
    const extractParameters = (parameters) => {
        parameters.forEach(param => {
            const paramName = param.getName();
            const paramType = param.getType();
            const isOptional = param.isOptional();
            params.push({
                name: paramName,
                type: paramType ? paramType.getText() : "any",
                isRequired: !isOptional
            });
        });
    };
    if (ts_morph_1.Node.isFunctionDeclaration(node)) {
        extractParameters(node.getParameters());
    }
    else if (ts_morph_1.Node.isVariableDeclaration(node)) {
        const initializer = node.getInitializer();
        if (initializer && ts_morph_1.Node.isArrowFunction(initializer)) {
            extractParameters(initializer.getParameters());
        }
    }
    else if (ts_morph_1.Node.isArrowFunction(node)) {
        extractParameters(node.getParameters());
    }
    return {
        name: getName(),
        isExported: isExported(),
        params: params,
        returnType: getReturnType(),
        usedInFiles: []
    };
}
