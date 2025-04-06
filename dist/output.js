"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeAST = analyzeAST;
exports.extractFunctionDeclarations = extractFunctionDeclarations;
exports.extractFunctionCalls = extractFunctionCalls;
const fs_1 = __importDefault(require("fs"));
function extractFunctionDeclarations(ast) {
    const functions = [];
    function traverse(node) {
        var _a, _b, _c;
        if (!node)
            return;
        if (node.type === 'FunctionDeclaration') {
            const functionInfo = {
                name: ((_a = node.id) === null || _a === void 0 ? void 0 : _a.name) || 'anonymous',
                params: [],
                returnType: 'unknown',
                location: { start: node.start || 0, end: node.end || 0 }
            };
            if (node.params && Array.isArray(node.params)) {
                node.params.forEach(param => {
                    var _a, _b;
                    let paramType = 'any';
                    if ((_b = (_a = param.typeAnnotation) === null || _a === void 0 ? void 0 : _a.typeAnnotation) === null || _b === void 0 ? void 0 : _b.type) {
                        const typeNode = param.typeAnnotation.typeAnnotation;
                        if (typeNode.type === 'TSStringKeyword')
                            paramType = 'string';
                        else if (typeNode.type === 'TSNumberKeyword')
                            paramType = 'number';
                        else if (typeNode.type === 'TSBooleanKeyword')
                            paramType = 'boolean';
                        else
                            paramType = typeNode.type.replace(/^TS/, '').replace(/Keyword$/, '').toLowerCase();
                    }
                    functionInfo.params.push({ name: param.name, type: paramType });
                });
            }
            if ((_c = (_b = node.returnType) === null || _b === void 0 ? void 0 : _b.typeAnnotation) === null || _c === void 0 ? void 0 : _c.type) {
                const returnTypeNode = node.returnType.typeAnnotation;
                if (returnTypeNode.type === 'TSVoidKeyword')
                    functionInfo.returnType = 'void';
                else if (returnTypeNode.type === 'TSStringKeyword')
                    functionInfo.returnType = 'string';
                else if (returnTypeNode.type === 'TSNumberKeyword')
                    functionInfo.returnType = 'number';
                else if (returnTypeNode.type === 'TSBooleanKeyword')
                    functionInfo.returnType = 'boolean';
                else
                    functionInfo.returnType = returnTypeNode.type.replace(/^TS/, '').replace(/Keyword$/, '').toLowerCase();
            }
            functions.push(functionInfo);
        }
        if (typeof node === 'object' && node !== null) {
            Object.keys(node).forEach(key => {
                const child = node[key];
                if (Array.isArray(child))
                    child.forEach(item => traverse(item));
                else if (child && typeof child === 'object' && key !== 'loc')
                    traverse(child);
            });
        }
    }
    traverse(ast.program);
    return functions;
}
function extractFunctionCalls(ast) {
    const functionCalls = [];
    function traverse(node) {
        if (!node)
            return;
        if (node.type === 'CallExpression') {
            const callInfo = {
                name: '',
                arguments: [],
                location: { start: node.start || 0, end: node.end || 0 }
            };
            if (node.callee.type === 'Identifier')
                callInfo.name = node.callee.name;
            else if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && node.callee.property.type === 'Identifier')
                callInfo.name = `${node.callee.object.name}.${node.callee.property.name}`;
            if (node.arguments && Array.isArray(node.arguments)) {
                node.arguments.forEach(arg => {
                    if (arg.type === 'StringLiteral')
                        callInfo.arguments.push(arg.value);
                    else if (arg.type === 'NumericLiteral')
                        callInfo.arguments.push(arg.value);
                    else if (arg.type === 'Identifier')
                        callInfo.arguments.push(`<${arg.name}>`);
                    else if (arg.type === 'BinaryExpression')
                        callInfo.arguments.push('<expression>');
                    else
                        callInfo.arguments.push('<complex-arg>');
                });
            }
            functionCalls.push(callInfo);
        }
        if (typeof node === 'object' && node !== null) {
            Object.keys(node).forEach(key => {
                const child = node[key];
                if (Array.isArray(child))
                    child.forEach(item => traverse(item));
                else if (child && typeof child === 'object' && key !== 'loc')
                    traverse(child);
            });
        }
    }
    traverse(ast.program);
    return functionCalls;
}
function analyzeAST(ast) {
    return {
        functions: extractFunctionDeclarations(ast),
        functionCalls: extractFunctionCalls(ast)
    };
}
function main(filePath) {
    try {
        const astJson = fs_1.default.readFileSync(filePath, 'utf8');
        const ast = JSON.parse(astJson);
        const analysis = analyzeAST(ast);
        console.log(JSON.stringify(analysis, null, 2));
        return analysis;
    }
    catch (error) {
        console.error('Error reading or parsing AST JSON:', error);
        return null;
    }
}
const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node ast_extractor.js <path_to_ast.json>');
    process.exit(1);
}
main(filePath);
