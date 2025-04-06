
import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import * as os from 'os';

export default async function runWorker(files: string[], workerIndex: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
        try {
            const workerPath = path.join(__dirname, 'worker.js');
            
            if (!fs.existsSync(workerPath)) {
                reject(new Error(`Worker file not found at ${workerPath}`));
                return;
            }
            
            const worker = new Worker(workerPath, {
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
        } catch (err) {
            reject(err);
        }
    });
}

