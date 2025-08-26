import * as fs from 'fs';
import * as path from 'path';

export class FileSystemService {
  public getXmlFilePaths(folderPath: string): string[] {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new Error(`O caminho especificado não é um diretório válido: ${folderPath}`);
    }
    return fs.readdirSync(folderPath)
      .filter(file => file.toLowerCase().endsWith('.xml'))
      .map(file => path.join(folderPath, file));
  }

  public renameFile(oldPath: string, newPath: string): void {
    fs.renameSync(oldPath, newPath);
  }

  public fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }
}