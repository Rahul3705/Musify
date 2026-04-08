export interface Song {
    id: number;
    title: string;
    artist: string;
    songUrl: string;
    imageUrl: string; // URL to the song's cover image
    createdAt: string;
    appUserId: number;
    appUserName: string;
}

export interface SongRequest{
    title: string;
    artist: string;
}