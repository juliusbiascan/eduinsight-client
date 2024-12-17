import { BrowserWindow, Menu, MenuItemConstructorOptions, Tray, screen } from "electron";
import { WindowManager } from ".";

let tray: Tray;
let mainWindow: BrowserWindow;

function getWindowPosition() {
  const windowBounds = mainWindow.getBounds();
  const workAreaSize = screen.getPrimaryDisplay().workAreaSize;

  // Position window in the bottom-right corner of the screen
  const x = workAreaSize.width - windowBounds.width - 10;
  const y = workAreaSize.height - windowBounds.height - 10;

  return { x, y };
}

function showWindow() {
  const position = getWindowPosition();
  mainWindow.webContents.reload();
  mainWindow.setPosition(position.x, position.y, false);
  mainWindow.show();
  mainWindow.focus();
}

function toggleWindow() {
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
      console.log("Preferences");
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