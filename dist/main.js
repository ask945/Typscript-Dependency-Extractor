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
Object.defineProperty(exports, "__esModule", { value: true });
// main.ts
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const worker_threads_1 = require("worker_threads");
const os = __importStar(require("os"));
// Get all TypeScript files recursively
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
// Split array into chunks
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}
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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const args = process.argv.slice(2);
        if (args.length === 0) {
            console.error("Usage: node parser.js <directory-path>");
            process.exit(1);
        }
        const targetDir = path.resolve(args[0]);
        console.log(`Scanning directory: ${targetDir}`);
        // Get all TypeScript files
        const allFiles = getAllFiles(targetDir);
        console.log(`Found ${allFiles.length} TypeScript files`);
        try {
            // Determine optimal number of workers (use 75% of available cores)
            const numCores = os.cpus().length;
            const numWorkers = Math.max(1, Math.floor(numCores * 0.75));
            // Split files into chunks for workers
            const filesPerWorker = Math.ceil(allFiles.length / numWorkers);
            const fileChunks = chunkArray(allFiles, filesPerWorker);
            console.time("AST Parsing");
            // Process files with workers
            const workerPromises = fileChunks.map((chunk, index) => runWorker(chunk, index));
            // Wait for all workers to complete
            const results = yield Promise.all(workerPromises);
            const astResults = results.flat();
            console.timeEnd("AST Parsing");
            // Save AST to a JSON file
            const outputPath = path.join(__dirname, "ast-output.json");
            fs.writeFileSync(outputPath, safeStringify(astResults));
            console.log(`Parsed ${astResults.length} files successfully.`);
            console.log(`AST saved to: ${outputPath}`);
        }
        catch (err) {
            console.error("Error in processing:", err);
            process.exit(1);
        }
    });
}
// Function to run a worker with minimal logging
function runWorker(files, workerIndex) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            try {
                const workerPath = path.join(__dirname, 'worker.js');
                if (!fs.existsSync(workerPath)) {
                    reject(new Error(`Worker file not found at ${workerPath}`));
                    return;
                }
                const worker = new worker_threads_1.Worker(workerPath, {
                    workerData: { files, workerIndex }
                });
                worker.on('message', (data) => {
                    resolve(data);
                });
                worker.on('error', (err) => {
                    reject(err);
                });
                worker.on('exit', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Worker ${workerIndex} exited with code ${code}`));
                    }
                });
            }
            catch (err) {
                reject(err);
            }
        });
    });
}
// Run the main function
main().catch(err => {
    console.error("Error in main:", err);
    process.exit(1);
});
