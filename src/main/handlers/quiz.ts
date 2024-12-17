import { IPCRoute, WindowIdentifier } from "@/shared/constants";
import { WindowManager } from "../lib";
import { ipcMain } from "electron";

/**
 * Sets up IPC handlers for quiz-related operations.
 * This function initializes an event listener for playing quizzes.
 * 
 * @function
 */
export default function () {
  /**
   * Handles the QUIZ_PLAY event.
   * When triggered, it retrieves the QuizPlayer window and sends the quiz ID to it after a short delay.
   * 
   * @param {string} quizId - The ID of the quiz to be played.
   */
  ipcMain.on(IPCRoute.QUIZ_PLAY, (_, quizId: string) => {
    const quiz = WindowManager.get(WindowIdentifier.QuizPlayer);
    quiz.on('ready-to-show', () => {
      quiz.webContents.send(IPCRoute.QUIZ_GET_QUIZ_ID, quizId);
    });
  });
}