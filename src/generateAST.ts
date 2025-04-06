import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import runWorker from './runWorker';
import parseFiles from './parseFiles';
import { FileAnalysis } from './utils/tokens';

function getAllFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) {
        console.error(`Error: Directory "${dir}" does not exist.`);
        process.exit(1);
    }

    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFiles(filePath, fileList);
        } else if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

function safeStringify(obj: any) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) return undefined;
            seen.add(value);
        }
        return value;
    }, 2);
}

export default async function generateAST(dir: string) {
    const FILE_THRESHOLD = 50;
    const targetDir = dir;
    const allFiles = getAllFiles(targetDir);
    console.log("No. of files", allFiles.length);
    let astResults: FileAnalysis[] = [];

    if (allFiles.length < FILE_THRESHOLD) {
        console.log("using simple parsing");
        console.time("AST parsing");
        astResults = parseFiles(allFiles);
    } else {
        try {
            console.log("using workers");
            console.time("AST parsing");
            const numCores = os.cpus().length;
            const numWorkers = Math.max(1, Math.floor(numCores * 0.75));

            const filesPerWorker = Math.ceil(allFiles.length / numWorkers);
            const fileChunks = chunkArray(allFiles, filesPerWorker);

            const workerPromises = fileChunks.map((chunk, index) => runWorker(chunk, index));
            const results = await Promise.all(workerPromises);
            astResults = results.flat();
        } catch (error) {
            console.log("Error while processing:", error);
            process.exit(1);
        }
    }

    
    const finalResult = normalizePathsFromSrc(astResults);
    const outputPath = path.join(__dirname, "ast-output.json");
    fs.writeFileSync(outputPath, safeStringify(finalResult));
    console.timeEnd("AST parsing");
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


function normalizePathsFromSrc(obj: any): any {
    const srcMarker = `src${path.sep}`;
    const replacePaths = (val: any): any => {
        if (typeof val === 'string') {
            const normalized = val.replace(/\\/g, '/'); 
            const srcIndex = normalized.indexOf('src/');
            if (srcIndex !== -1) {
                const relativePath = normalized.slice(srcIndex).replace(/\//g, '\\');
                return relativePath;
            }
            return val;
        } else if (Array.isArray(val)) {
            return val.map(replacePaths);
        } else if (val && typeof val === 'object') {
            const newObj: any = {};
            for (const key in val) {
                newObj[key] = replacePaths(val[key]);
            }
            return newObj;
        }
        return val;
    };
    return replacePaths(obj);
}
