export { 
    PLUGIN_TITLE, 
    PLUGIN_VERSION,
    PLUGIN_NAME, 
    RISU_ARGS, 
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
const PLUGIN_VERSION = 'v0.2.0' 
const PLUGIN_NAME = `${PLUGIN_TITLE}-${PLUGIN_VERSION}`

// Argument Name Definitions

// Plugin Arguments Definition
const RISU_ARGS: RisuArgs = {

}
