export enum InlayType {
    Image = 'image',
    Video = 'video',
    Audio = 'audio'
}

export interface InlayData {
    name: string,
    data: string | Blob,
    ext: string
    height: number
    width: number
    type: InlayType
}