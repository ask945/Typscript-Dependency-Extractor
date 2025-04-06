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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = extractImportInfo;
exports.parseImports = parseImports;
exports.analyzeProjectImports = analyzeProjectImports;
const ts_morph_1 = require("ts-morph");
const path = __importStar(require("path"));
function extractImportInfo(importDecl, sourceFilePath) {
    var _a;
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const namedImports = importDecl.getNamedImports().map(namedImport => namedImport.getName());
    const defaultImport = ((_a = importDecl.getDefaultImport()) === null || _a === void 0 ? void 0 : _a.getText()) || "";
    const isTypeOnly = importDecl.isTypeOnly();
    let resolvedFilePath = undefined;
    if (moduleSpecifier.startsWith(".") || moduleSpecifier.startsWith("/")) {
        try {
            const sourceDir = path.dirname(sourceFilePath);
            const extensions = ["", ".ts", ".tsx", ".js", ".jsx"];
            for (const ext of extensions) {
                const potentialPath = path.resolve(sourceDir, moduleSpecifier + ext);
                resolvedFilePath = potentialPath;
                break;
            }
        }
        catch (error) {
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
function parseImports(files) {
    const project = new ts_morph_1.Project();
    const allImports = [];
    files.forEach((file) => {
        const sourceFile = project.addSourceFileAtPath(file);
        const fileImports = [];
        sourceFile.getImportDeclarations().forEach(importDecl => {
            const importInfo = extractImportInfo(importDecl, file);
            fileImports.push(importInfo);
        });
        allImports.push(...fileImports);
    });
    return allImports;
}
function analyzeProjectImports(files) {
    const project = new ts_morph_1.Project();
    const importMap = new Map();
    const sourceFiles = files.map(file => project.addSourceFileAtPath(file));
    sourceFiles.forEach(sourceFile => {
        const filePath = sourceFile.getFilePath();
        const fileImports = [];
        sourceFile.getImportDeclarations().forEach(importDecl => {
            const importInfo = extractImportInfo(importDecl, filePath);
            fileImports.push(importInfo);
        });
        importMap.set(filePath, fileImports);
    });
    const findCircularDependencies = () => {
        const visited = new Set();
        const recursionStack = new Set();
        const circularDependencies = [];
        const dfs = (currentPath, path = []) => {
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
