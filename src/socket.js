const { Server } = require("socket.io");
const supabase = require('./config/supabaseClient');

const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        // User joins their own room to receive private messages
        socket.on("join_chat", (userId) => {
            socket.join(userId);
        });

        // Join a specific conversation room (optional, depending on UX)
        socket.on("join_room", (room) => {
            socket.join(room);
        });

        socket.on("send_message", async (data) => {
            // data should include: senderId, receiverId, content, type (text/image)
            const { senderId, receiverId, content, type = 'text', ticketId } = data;

            try {
                // Validate UUIDs roughly
                if (!senderId || !receiverId) {
                    console.error("[Socket] Missing sender or receiver ID");
                    return;
                }

                const messagePayload = {
                    senderId,
                    receiverId, // This MUST match the column name in Supabase
                    content,
                    type,
                    isRead: false,
                    createdAt: new Date().toISOString(),
                    ticketId: ticketId || null
                };

                // Persist to Supabase
                const { data: savedMessage, error } = await supabase
                    .from('Message')
                    .insert([messagePayload])
                    .select()
                    .single();

                if (error) {
                    console.error("[Socket] DB Insert Error:", error);
                    socket.emit("message_error", { error: error.message });
                    return;
                }

                // Fetch sender details to allow instant UI update on client without extra API call
                const { data: senderUser } = await supabase
                    .from('User')
                    .select('name, email')
                    .eq('id', senderId)
                    .single();

                const enrichedMessage = {
                    ...savedMessage,
                    senderName: senderUser?.name || senderUser?.email || 'User'
                };

                // Emit to receiver's room with sender info
                io.to(receiverId).emit("receive_message", enrichedMessage);

                // Confirm to sender (so they know it saved)
                socket.emit("message_sent", savedMessage);

            } catch (err) {
                console.error("[Socket] Exception:", err);
            }
        });

        socket.on("update_message", (data) => {
            io.to(data.receiverId).emit("message_updated", data);
        });

        socket.on("disconnect", () => {
        });
    });

    return io;
};

module.exports = initSocket;
