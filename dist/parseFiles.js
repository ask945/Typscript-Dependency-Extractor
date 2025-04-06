"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseFiles;
const ts_morph_1 = require("ts-morph");
const ComponentInfo_1 = __importDefault(require("./ComponentInfo"));
const FunctionInfo_1 = __importDefault(require("./FunctionInfo"));
const InterfaceInfo_1 = __importDefault(require("./InterfaceInfo"));
const TypeInfo_1 = __importDefault(require("./TypeInfo"));
const ClassInfo_1 = __importDefault(require("./ClassInfo"));
const VariableInfo_1 = __importDefault(require("./VariableInfo"));
const ImportInfo_1 = __importDefault(require("./ImportInfo"));
const path = __importStar(require("path"));
function parseFiles(files) {
    const project = new ts_morph_1.Project();
    const sourceFiles = files.map(file => project.addSourceFileAtPath(file));
    const fileAnalyses = [];
    sourceFiles.forEach(sourceFile => {
        const filePath = sourceFile.getFilePath();
        const fileName = path.basename(filePath);
        const components = [];
        // Function components
        sourceFile.getFunctions().forEach(func => {
            var _a, _b, _c;
            const isComponent = ((_b = (_a = func.getName()) === null || _a === void 0 ? void 0 : _a.charAt(0)) === null || _b === void 0 ? void 0 : _b.toUpperCase()) === ((_c = func.getName()) === null || _c === void 0 ? void 0 : _c.charAt(0));
            if (isComponent) {
                components.push((0, ComponentInfo_1.default)(func, "function"));
            }
        });
        // Arrow function components
        sourceFile.getVariableDeclarations().forEach(varDecl => {
            const initializer = varDecl.getInitializer();
            const name = varDecl.getName();
            if (initializer && name.charAt(0).toUpperCase() === name.charAt(0)) {
                if (initializer.getKind() === 206) { // ArrowFunction kind
                    components.push((0, ComponentInfo_1.default)(varDecl, "arrow"));
                }
            }
        });
        // Class components & regular classes
        const classes = [];
        sourceFile.getClasses().forEach(classDecl => {
            var _a;
            const isComponent = ((_a = classDecl.getExtends()) === null || _a === void 0 ? void 0 : _a.getText().includes('Component')) || false;
            if (isComponent) {
                components.push((0, ComponentInfo_1.default)(classDecl, "class"));
            }
            else {
                classes.push((0, ClassInfo_1.default)(classDecl));
            }
        });
        // Regular functions (excluding components)
        const functions = [];
        sourceFile.getFunctions()
            .filter(func => !components.some(comp => comp.name === func.getName()))
            .forEach(func => {
            functions.push((0, FunctionInfo_1.default)(func, "function"));
        });
        sourceFile.getVariableDeclarations().forEach(varDecl => {
            const initializer = varDecl.getInitializer();
            if (initializer && initializer.getKind() === 206 &&
                !components.some(comp => comp.name === varDecl.getName())) {
                functions.push((0, FunctionInfo_1.default)(varDecl, "arrow"));
            }
        });
        const interfaces = sourceFile.getInterfaces().map(interfaceDecl => (0, InterfaceInfo_1.default)(interfaceDecl));
        const types = sourceFile.getTypeAliases().map(typeAlias => (0, TypeInfo_1.default)(typeAlias));
        const variables = [];
        sourceFile.getVariableStatements().forEach(statement => {
            statement.getDeclarations().forEach(declaration => {
                const initializer = declaration.getInitializer();
                if (!initializer || initializer.getKind() !== 206) {
                    variables.push((0, VariableInfo_1.default)(declaration, statement));
                }
            });
        });
        const imports = sourceFile.getImportDeclarations().map(importDecl => (0, ImportInfo_1.default)(importDecl, filePath));
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
