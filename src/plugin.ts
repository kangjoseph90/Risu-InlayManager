export { 
    PLUGIN_TITLE, 
    PLUGIN_VERSION,
    PLUGIN_NAME, 
    RISU_ARGS, 
    TIME_DB_ARG,
    CHAT_DB_ARG,
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
const PLUGIN_VERSION = '0.2.1' 
const PLUGIN_NAME = `${PLUGIN_TITLE} v${PLUGIN_VERSION}`

// Argument Name Definitions
const TIME_DB_ARG = 'time_db'
const CHAT_DB_ARG = 'chat_db'

// Plugin Arguments Definition
const RISU_ARGS: RisuArgs = {
    [TIME_DB_ARG]: RisuArgType.String,
    [CHAT_DB_ARG]: RisuArgType.String,
}

/**
 * 등록된 모든 Risu Arg 이름을 배열로 반환
 */
export function getAllArgNames(): string[] {
    return Object.keys(RISU_ARGS);
}