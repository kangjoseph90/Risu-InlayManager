export enum InlayType {
    Image = 'image',
    Video = 'video',
    Audio = 'audio'
}

export interface InlayData {
    name: string,
    data: string | Blob,  // base64 data URI or Blob
    ext: string
    height: number
    width: number
    type: InlayType
}