import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';
import jwt from 'jsonwebtoken';

// Store Yjs documents in memory (in production, persist to DB)
const documents = new Map<string, Y.Doc>();
const documentConnections = new Map<string, Set<string>>();

interface UserInfo {
    id: string;
    name: string;
    email: string;
    color: string;
    cursor?: { line: number; column: number };
}

const userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

let colorIndex = 0;

function getNextColor(): string {
    const color = userColors[colorIndex % userColors.length];
    colorIndex++;
    return color;
}

function getOrCreateDoc(docId: string): Y.Doc {
    if (!documents.has(docId)) {
        const doc = new Y.Doc();
        documents.set(docId, doc);
        documentConnections.set(docId, new Set());
    }
    return documents.get(docId)!;
}

export function initializeWebSocket(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            // Allow anonymous connections for shared docs
            (socket as any).user = { id: 'anon-' + socket.id, name: 'Anonymous', email: '' };
            return next();
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'apiflow-secret') as any;
            (socket as any).user = {
                id: decoded.id,
                name: decoded.name,
                email: decoded.email
            };
            next();
        } catch (err) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const user: UserInfo = {
            ...(socket as any).user,
            color: getNextColor()
        };

        console.log(`📡 User connected: ${user.name} (${socket.id})`);

        // Join a document editing session
        socket.on('doc:join', ({ docId }: { docId: string }) => {
            const doc = getOrCreateDoc(docId);
            const connections = documentConnections.get(docId)!;

            socket.join(docId);
            connections.add(socket.id);

            // Send current document state to new joiner
            const state = Y.encodeStateAsUpdate(doc);
            socket.emit('doc:init', {
                state: Array.from(state),
                users: getDocUsers(docId, io)
            });

            // Notify others
            socket.to(docId).emit('user:joined', {
                userId: user.id,
                name: user.name,
                color: user.color
            });

            console.log(`📝 ${user.name} joined doc: ${docId} (${connections.size} editors)`);
        });

        // Handle document updates (CRDT sync)
        socket.on('doc:update', ({ docId, update }: { docId: string; update: number[] }) => {
            const doc = getOrCreateDoc(docId);

            try {
                const updateArray = new Uint8Array(update);
                Y.applyUpdate(doc, updateArray);

                // Broadcast to other users in the same doc
                socket.to(docId).emit('doc:update', {
                    update,
                    userId: user.id
                });
            } catch (error) {
                console.error('Error applying update:', error);
            }
        });

        // Handle cursor updates
        socket.on('cursor:update', ({ docId, cursor }: { docId: string; cursor: { line: number; column: number } }) => {
            user.cursor = cursor;
            socket.to(docId).emit('cursor:update', {
                userId: user.id,
                name: user.name,
                color: user.color,
                cursor
            });
        });

        // Handle awareness updates (selection, name, etc.)
        socket.on('awareness:update', ({ docId, state }: { docId: string; state: any }) => {
            socket.to(docId).emit('awareness:update', {
                userId: user.id,
                name: user.name,
                color: user.color,
                state
            });
        });

        // Leave document
        socket.on('doc:leave', ({ docId }: { docId: string }) => {
            leaveDoc(socket, docId, user, io);
        });

        // Disconnect
        socket.on('disconnect', () => {
            // Leave all docs
            for (const [docId, connections] of documentConnections.entries()) {
                if (connections.has(socket.id)) {
                    leaveDoc(socket, docId, user, io);
                }
            }
            console.log(`📡 User disconnected: ${user.name} (${socket.id})`);
        });
    });

    console.log('📡 WebSocket server initialized');
    return io;
}

function leaveDoc(socket: Socket, docId: string, user: UserInfo, io: Server) {
    const connections = documentConnections.get(docId);
    if (connections) {
        connections.delete(socket.id);
        socket.leave(docId);

        // Notify others
        socket.to(docId).emit('user:left', {
            userId: user.id,
            name: user.name
        });

        // Clean up empty docs after some time
        if (connections.size === 0) {
            setTimeout(() => {
                const conns = documentConnections.get(docId);
                if (conns && conns.size === 0) {
                    documents.delete(docId);
                    documentConnections.delete(docId);
                }
            }, 60000); // Keep for 1 minute
        }
    }
}

function getDocUsers(docId: string, io: Server): UserInfo[] {
    const room = io.sockets.adapter.rooms.get(docId);
    if (!room) return [];

    const users: UserInfo[] = [];
    for (const socketId of room) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
            users.push((socket as any).user);
        }
    }
    return users;
}
