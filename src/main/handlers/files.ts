import { app, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';

export default function () {
  const getDownloadsFolder = () => {
    const downloadPath = path.join(app.getPath('downloads'), 'EduInsight');
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
    return downloadPath;
  };

  ipcMain.handle('get-downloads', () => {
    try {
      const downloadsPath = getDownloadsFolder();
      const subjects: string[] = [];
      const files: { name: string; path: string; subjectName: string; date: string }[] = [];

      // Read subject folders
      const subjectFolders = fs.readdirSync(downloadsPath);
      
      if (subjectFolders.length === 0) {
        return { files: [], subjects: [], isEmpty: true };
      }

      subjectFolders.forEach(subject => {
        const subjectPath = path.join(downloadsPath, subject);
        if (fs.statSync(subjectPath).isDirectory()) {
          try {
            const subjectFiles = fs.readdirSync(subjectPath);
            if (subjectFiles.length > 0) {
              subjects.push(subject);
              
              subjectFiles.forEach(file => {
                const filePath = path.join(subjectPath, file);
                try {
                  const stats = fs.statSync(filePath);
                  if (stats.isFile()) {
                    files.push({
                      name: file,
                      path: filePath,
                      subjectName: subject,
                      date: stats.mtime.toISOString()
                    });
                  }
                } catch (error) {
                  console.error(`Error reading file ${file}:`, error);
                }
              });
            }
          } catch (error) {
            console.error(`Error reading subject folder ${subject}:`, error);
          }
        }
      });

      return { 
        files, 
        subjects,
        isEmpty: files.length === 0 
      };
    } catch (error) {
      console.error('Error reading downloads folder:', error);
      return { files: [], subjects: [], isEmpty: true, error: error.message };
    }
  });

  ipcMain.handle('open-downloads-folder', () => {
    try {
      const folderPath = getDownloadsFolder();
      return shell.openPath(folderPath);
    } catch (error) {
      console.error('Error opening downloads folder:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('open-file', async (_, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }
      return await shell.openPath(filePath);
    } catch (error) {
      console.error('Error opening file:', error);
      return Promise.reject(error);
    }
  });
}
