export enum FileConfig {
  CHUNK_SIZE = 512 * 1024,
  MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024,
}

export enum ConnectionMode {
  Local = 'LOCAL',
  Remote = 'REMOTE'
}

/**
 * Browser Window unique identifier names.
 *k
 * @enum
 */
export enum WindowIdentifier {
  Main = 'main_window',
  Dashboard = 'dashboard_window',
  Setup = 'setup_window',
  QuizPlayer = 'quiz_player_window',
  About = 'about_window',
}

/**
 * IPC listener route names.
 *
 * @enum
 */
export enum IPCRoute {
  APP_INFO = '/application/info',
  APP_OPEN_AT_LOGIN = '/app/open-at-login',
  APP_UPDATE = '/app/update',
  
  DATABASE_UPDATE_QUIZ_QUESTIONS_BULK = 'database:update-quiz-questions-bulk',
  OPEN_EXTERNAL_LINK = '/open_external_link',
  WINDOW_OPEN_SETUP = '/window/open-setup',
  WINDOW_CREATE_TRAY = '/window/create-tray',
  WINDOW_REMOVE_TRAY = '/window/remove-tray',

  CONNECTION_STATUS_UPDATE = '/connection/status-update',
  DATABASE_GET_DEVICE_USER_BY_ID = '/database/get_device_user_by_id',
  DATABASE_VERIFY_DEVICE = '/database/verify_device',
  DATABASE_IMPORT_GOOGLE_FORMS = 'database:import-google-forms',
  DATABASE_IMPORT_SPREADSHEET = 'database:import-spreadsheet',
  DATABASE_ADD_QUESTIONS_TO_QUIZ = 'database:add-questions-to-quiz',

  QUIZ_PLAY = '/quiz/play',
  QUIZ_GET_QUIZ_ID = '/quiz/get_quiz_id',
  DATABASE_PUBLISH_QUIZ = '/database/publish_quiz',
  DATABASE_CONNECT = '/database/connect',
  DATABASE_DISCONNECT = '/database/disconnect',
  DATABASE_CHECK_CONNECTION = '/database/check_connection',
  DATABASE_GET_LABS = '/database/get_labs',
  DATABASE_REGISTER_DEVICE = '/database/register_device',
  DATABASE_GET_NETWORK_NAMES = '/database/get_network_names',
  DATABASE_GET_DEVICE = '/database/get_device',
  DATABASE_GET_DEVICE_BY_MAC = '/database/get_device_by_mac',
  DATABASE_GET_DEVICE_BY_ID = '/database/get_device_by_id',
  DATABASE_GET_ACTIVE_USER_BY_DEVICE_ID_AND_LAB_ID = '/database/get_active_user_by_device_id_and_lab_id',
  DATABASE_GET_DEVICE_USER_BY_ACTIVE_USER_ID = '/database/get_device_user_by_active_user_id',
  DATABASE_GET_USER_RECENT_LOGIN_BY_USER_ID = '/database/get_user_recent_login_by_user_id',
  DATABASE_GET_ALL_DEVICE_USERS_BY_LAB_ID = '/database/get_all_device_users_by_lab_id',
  DATABASE_GET_ALL_ACTIVE_DEVICE_USERS_BY_LAB_ID = '/database/get_all_active_device_users_by_lab_id',
  DATABASE_GET_SUBJECT_RECORDS_BY_SUBJECT_ID = '/database/get_subject_records_by_subject_id',
  DATABASE_GET_ACTIVE_USERS_BY_SUBJECT_ID = '/database/get_active_users_by_subject_id',
  DATABASE_GET_ACTIVE_USER_BY_USER_ID = '/database/get_user_by_id',
  DATABASE_GET_SUBJECTS_BY_LAB_ID = '/database/get_subjects_by_lab_id',
  DATABASE_GET_SUBJECTS_BY_USER_ID = '/database/get_subjects_by_user_id',
  DATABASE_GET_SUBJECT_BY_ID = '/database/get_subject_by_id',
  DATABASE_GET_STUDENT_SUBJECTS = '/database/get_student_subjects',
  DATABASE_GET_SUBJECT_DATA = '/database/get_subject_data',
  DATABASE_JOIN_SUBJECT = '/database/join_subject',
  DATABASE_LEAVE_SUBJECT = '/database/leave_subject',
  DATABASE_DELETE_SUBJECT = '/database/delete_subject',
  DATABASE_USER_LOGOUT = '/database/user_logout',
  DATABASE_CREATE_SUBJECT = '/database/create_subject',
  DATABASE_GET_QUIZZES_BY_USER_ID = '/database/get_quizzes_by_user_id',
  DATABASE_GET_QUIZ_BY_ID = '/database/get_quiz_by_id',
  DATABASE_GET_QUIZ_BY_SUBJECT_ID = '/database/get_quiz_by_subject_id',
  DATABASE_DELETE_QUIZ = '/database/delete_quiz',
  DATABASE_CREATE_QUIZ = '/database/create_quiz',
  DATABASE_UPDATE_QUIZ = '/database/update_quiz',
  DATABASE_CREATE_QUIZ_QUESTION = '/database/create_quiz_question',
  DATABASE_UPDATE_QUIZ_QUESTION = '/database/update_quiz_question',
  DATABASE_DELETE_QUIZ_QUESTION = '/database/delete_quiz_question',
  DATABASE_SAVE_QUIZ_RECORD = '/database/save_quiz_record',
  DATABASE_UPDATE_QUIZ_QUESTIONS_ORDER = 'database:update-quiz-questions-order',
  DATABASE_GET_LABORATORY_STATUS = '/database/get_laboratory_status',  
  UPDATER_CHECKING = '/updater/checking',
  UPDATER_DOWNLOADING = '/updater/downloading',
  UPDATER_FINISHED = '/updater/finished',
  UPDATER_INSTALL = '/updater/install',
  UPDATER_NO_UPDATE = '/updater/noUpdate',
  UPDATER_START = '/updater/start',

  WINDOW_CLOSE = '/window/close',
  WINDOW_SEND = '/window/send',
  WINDOW_OPEN = '/window/open',
  WINDOW_HIDE = '/window/hide',
  WINDOW_OPEN_IN_TRAY = '/window/open_in_tray',

  DEVICE_INITIATED = '/device/initiated',
  DEVICE_VERIFY_HOST_NAME = '/device/verify_host_name',
  DEVICE_GET_DEVICE_ID = '/device/get_device_id',
  DEVICE_START_MONITORING = '/device/start_monitoring',
  DEVICE_STOP_MONITORING = '/device/stop_monitoring',

  // Add these new routes
  STORE_GET = '/store/get',
  STORE_SET = '/store/set',
  STORE_DELETE = '/store/delete',
  STORE_CLEAR = '/store/clear',
  STORE_HAS = '/store/has',

  INITIALIZE_SOCKET = '/initialize_socket',
  TEST_SOCKET_URL = '/test_socket_url',
  WINDOW_CLOSE_SETUP = '/window/close-setup',

  // Add these new routes
  AUTH_LOGIN = '/auth/login',
  AUTH_REGISTER = '/auth/register',
  DATABASE_GET_QUIZ_RECORDS_BY_USER_AND_SUBJECT = '/database/get_quiz_records_by_user_and_subject',

  SEND_OTP = '/send_otp',
  VERIFY_OTP_AND_RESET_PASSWORD = '/verify_otp_and_reset_password',

  SCREEN_ID = '/screen/id',
  SCREEN_SHARE_STOP = '/screen/share-stop',

  // New routes
  GET_DOWNLOADS = 'get-downloads',
  OPEN_DOWNLOADS_FOLDER = 'open-downloads-folder',
  OPEN_FILE = 'open-file',

  // Notification routes
  DATABASE_GET_NOTIFICATIONS = '/database/get-notifications',
  DATABASE_ADD_NOTIFICATION = '/database/add-notification',
  DATABASE_MARK_NOTIFICATION_READ = '/database/mark-notification-read',
  DATABASE_REMOVE_NOTIFICATION = '/database/remove-notification',
  DATABASE_CLEAR_NOTIFICATIONS = '/database/clear-notifications',
  DATABASE_MARK_ALL_NOTIFICATIONS_READ = '/database/mark-all-notifications-read',

  DATABASE_UPDATE_USER = '/database/update_user',

  VERIFY_USER_EMAIL = 'VERIFY_USER_EMAIL',
  VERIFY_PERSONAL_INFO = 'VERIFY_PERSONAL_INFO',
  AUTH_VERIFY_USER = 'AUTH_VERIFY_USER',

  DATABASE_UPDATE_DEVICE = '/database/update_device',
  DATABASE_ARCHIVE_DEVICE = '/database/archive_device',
}

export interface LoginData {
  deviceId: string;
  email?: string;
  studentId?: string;
  password: string;
  allowDirectLogin?: boolean;
}
