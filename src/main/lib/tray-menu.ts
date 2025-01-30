import { app, BrowserWindow, Menu, MenuItemConstructorOptions, Tray } from "electron";
import { WindowManager } from ".";

let tray: Tray;
let mainWindow: BrowserWindow;


export function showWindow() {
  mainWindow.maximize();
  mainWindow.show();
  mainWindow.focus();
}

export function toggleWindow() {
  mainWindow = WindowManager.get(WindowManager.WINDOW_CONFIGS.dashboard_window.id);
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
}

const menuTemplate: MenuItemConstructorOptions[] = [
  {
    label: "About EduInsight",
    click: () => {
      console.log("About EduInsight");
    }
  },
  {
    type: "separator"
  },
  {
    label: "Preferences",
    accelerator: "Cmd+,",
    click: () => {
      WindowManager.get(WindowManager.WINDOW_CONFIGS.setup_window.id);
    }
  },
  {
    label: "Quit",
    accelerator: "Cmd+x",
    click: () => {
      app.quit();
    }
  },
  {
    type: "separator"
  }
]

export const createTray = (iconPath: string) => {
  if (tray) {
    return;
  }
  const menu = Menu.buildFromTemplate(menuTemplate);
  tray = new Tray(iconPath);
  tray.on("click", () => {
    toggleWindow();
  });
  tray.on("right-click", () => {
    tray.popUpContextMenu(menu);
  });
  tray.setToolTip("EduInsight");
}

export const removeTray = () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}