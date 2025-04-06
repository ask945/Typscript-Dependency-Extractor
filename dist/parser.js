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
const ts = __importStar(require("typescript"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function getAllFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) {
        console.error(`Error: Directory "${dir}" does not exist.`);
        process.exit(1);
    }
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFiles(filePath, fileList);
        }
        else if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
            fileList.push(filePath);
        }
    });
    return fileList;
}
function parseFiles(files) {
    return files.map((file) => {
        const sourceCode = fs.readFileSync(file, "utf-8");
        const ast = ts.createSourceFile(file, sourceCode, ts.ScriptTarget.Latest, true);
        // Convert AST to a JSON-safe format (removes circular references)
        const astJSON = ts.transform(ast, []).transformed[0];
        return { file, ast: astJSON };
    });
}
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: node parser.js <directory-path>");
    process.exit(1);
}
const targetDir = path.resolve(args[0]);
console.log(`Scanning directory: ${targetDir}`);
const allFiles = getAllFiles(targetDir);
console.time("AST Parsing");
const astResults = parseFiles(allFiles);
console.timeEnd("AST Parsing");
// Safe serialization: Remove circular references
function safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value))
                return undefined; // Remove circular ref
            seen.add(value);
        }
        return value;
    }, 2);
}
// Save AST to a JSON file
const outputPath = path.join(__dirname, "ast-output.json");
fs.writeFileSync(outputPath, safeStringify(astResults));
console.log(`Parsed ${astResults.length} files successfully.`);
console.log(`AST saved to: ${outputPath}`);
