export { 
    PLUGIN_TITLE, 
    PLUGIN_VERSION,
    PLUGIN_NAME, 
    RISU_ARGS, 
    TIME_DB_ARG,
    CHAT_DB_ARG,
    IS_LOGGED_IN,
    ACCESS_TOKEN,
    ACCESS_TOKEN_EXPIRES,
    REFRESH_TOKEN,
    SYNC_ENABLED,
    DELETED_INLAYS,
    RisuArgType
};

enum RisuArgType {
    String = 'string',
    Int = 'int',
}

interface RisuArgs {
    [key: string]: RisuArgType;
}

// Plugin Info
const PLUGIN_TITLE = 'InlayManager'
const PLUGIN_VERSION = '0.3.0' 
const PLUGIN_NAME = `${PLUGIN_TITLE} v${PLUGIN_VERSION}`

// Argument Name Definitions
const TIME_DB_ARG = 'time_db'
const CHAT_DB_ARG = 'chat_db'
const IS_LOGGED_IN = 'is_logged_in'
const ACCESS_TOKEN = 'access_token'
const ACCESS_TOKEN_EXPIRES = 'access_token_expires'
const REFRESH_TOKEN = 'refresh_token'
const SYNC_ENABLED = 'sync_enabled'
const DELETED_INLAYS = 'deleted_inlays'
// Plugin Arguments Definition
const RISU_ARGS: RisuArgs = {
    [TIME_DB_ARG]: RisuArgType.String,
    [CHAT_DB_ARG]: RisuArgType.String,
    [IS_LOGGED_IN]: RisuArgType.Int,
    [ACCESS_TOKEN]: RisuArgType.String,
    [ACCESS_TOKEN_EXPIRES]: RisuArgType.String,
    [REFRESH_TOKEN]: RisuArgType.String,
    [SYNC_ENABLED]: RisuArgType.Int,
    [DELETED_INLAYS]: RisuArgType.String,
}

/**
 * 등록된 모든 Risu Arg 이름을 배열로 반환
 */
export function getAllArgNames(): string[] {
    return Object.keys(RISU_ARGS);
}