import path from "path";
import { FileAnalysis } from "./utils/tokens";

export default function resolveDependencies(files: FileAnalysis[]): FileAnalysis[] {
    const componentMap = new Map<string, string>(); 
    for (const file of files) {
        for (const comp of file.exports.components) {
            if (comp.isExported) {
                componentMap.set(comp.name, file.filePath);
            }
        }
    }

    for (const currentFile of files) {
        const incoming = new Set<string>(); 
        const outgoing = new Set<string>();
        for (const imp of currentFile.imports) {
            if (!imp.resolvedFilePath || imp.resolvedFilePath === currentFile.filePath) continue;
            incoming.add(imp.resolvedFilePath);
        }
        for (const otherFile of files) {
            if (path.normalize(otherFile.filePath) === path.normalize(currentFile.filePath)) continue;
        
            for (const imp of otherFile.imports) {
                if (!imp.resolvedFilePath) continue;
        
                const normalizedResolvedPath = path.normalize(imp.resolvedFilePath.endsWith(".ts")
                    ? imp.resolvedFilePath
                    : imp.resolvedFilePath + ".ts");
        
                const normalizedCurrentFilePath = path.normalize(currentFile.filePath);
        
                if (normalizedResolvedPath === normalizedCurrentFilePath) {
                    outgoing.add(otherFile.filePath);
                }
            }
        }
        currentFile.incomingDependencies = Array.from(incoming);
        currentFile.outgoingDependencies = Array.from(outgoing);
    }

    return files;
}
