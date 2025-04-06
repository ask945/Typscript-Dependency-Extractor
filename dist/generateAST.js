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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = generateAST;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const runWorker_1 = __importDefault(require("./runWorker"));
const parseFiles_1 = __importDefault(require("./parseFiles"));
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
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}
function safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value))
                return undefined;
            seen.add(value);
        }
        return value;
    }, 2);
}
function generateAST(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const FILE_THRESHOLD = 50;
        const targetDir = dir;
        const allFiles = getAllFiles(targetDir);
        console.log("No. of files", allFiles.length);
        let astResults = [];
        if (allFiles.length < FILE_THRESHOLD) {
            console.log("using simple parsing");
            console.time("AST parsing");
            astResults = (0, parseFiles_1.default)(allFiles);
        }
        else {
            try {
                console.log("using workers");
                console.time("AST parsing");
                const numCores = os.cpus().length;
                const numWorkers = Math.max(1, Math.floor(numCores * 0.75));
                const filesPerWorker = Math.ceil(allFiles.length / numWorkers);
                const fileChunks = chunkArray(allFiles, filesPerWorker);
                const workerPromises = fileChunks.map((chunk, index) => (0, runWorker_1.default)(chunk, index));
                const results = yield Promise.all(workerPromises);
                astResults = results.flat();
            }
            catch (error) {
                console.log("Error while processing:", error);
                process.exit(1);
            }
        }
        const finalResult = normalizePathsFromSrc(astResults);
        const outputPath = path.join(__dirname, "ast-output.json");
        fs.writeFileSync(outputPath, safeStringify(finalResult));
        console.timeEnd("AST parsing");
    });
}
if (require.main === module) {
    const dir = process.argv[2];
    if (!dir) {
        console.error("Error: Please provide a directory path.");
        process.exit(1);
    }
    generateAST(dir).catch(err => {
        console.error("Error:", err);
        process.exit(1);
    });
}
function normalizePathsFromSrc(obj) {
    const srcMarker = `src${path.sep}`;
    const replacePaths = (val) => {
        if (typeof val === 'string') {
            const normalized = val.replace(/\\/g, '/');
            const srcIndex = normalized.indexOf('src/');
            if (srcIndex !== -1) {
                const relativePath = normalized.slice(srcIndex).replace(/\//g, '\\');
                return relativePath;
            }
            return val;
        }
        else if (Array.isArray(val)) {
            return val.map(replacePaths);
        }
        else if (val && typeof val === 'object') {
            const newObj = {};
            for (const key in val) {
                newObj[key] = replacePaths(val[key]);
            }
            return newObj;
        }
        return val;
    };
    return replacePaths(obj);
}
