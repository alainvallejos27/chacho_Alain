import { io, type Socket } from 'socket.io-client';

export class SocketService {
  public readonly socket: Socket;
  private readonly roomStorageKey = 'cacho-boliviano-room';

  constructor(url: string = window.location.origin) {
    this.socket = io(url);
  }

  get roomCode(): string | null {
    return localStorage.getItem(this.roomStorageKey);
  }

  get isRoomHost(): boolean {
    return localStorage.getItem(`${this.roomStorageKey}-host`) === 'true';
  }

  persistRoom(code: string | null, host = false): void {
    if (code) {
      localStorage.setItem(this.roomStorageKey, code);
      localStorage.setItem(`${this.roomStorageKey}-host`, String(host));
      return;
    }
    localStorage.removeItem(this.roomStorageKey);
    localStorage.removeItem(`${this.roomStorageKey}-host`);
  }
}
