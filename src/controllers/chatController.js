const supabase = require('../config/supabaseClient');

exports.getMessages = async (req, res) => {
    const { userId, otherUserId } = req.params;

    // Fetch messages between two users
    const { data, error } = await supabase
        .from('Message')
        .select('*')
        .or(`and(senderId.eq.${userId},receiverId.eq.${otherUserId}),and(senderId.eq.${otherUserId},receiverId.eq.${userId})`)
        .order('createdAt', { ascending: true });

    if (error) {
        console.error("[Chat] History Error:", error);
        return res.status(400).json({ error: error.message });
    }

    res.json(data);
};

exports.getInbox = async (req, res) => {
    const { userId } = req.params;

    // Fetch all messages involving the user
    // We order by createdAt DESC so we encounter the latest message first
    const { data, error } = await supabase
        .from('Message')
        .select('*')
        .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error("[Chat] Inbox Query Error:", error);
        return res.status(400).json({ error: error.message });
    }

    // Process in memory to find unique conversations
    const conversationsMap = new Map();

    data.forEach(msg => {
        // Determine who the "other" person is
        const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;

        // If we haven't seen this user yet, this is the latest message (because of sort order)
        if (otherId && !conversationsMap.has(otherId)) {
            conversationsMap.set(otherId, {
                ...msg,
                otherUserId: otherId
            });
        }
    });

    const uniqueConversations = Array.from(conversationsMap.values());

    // Enrich with user names
    if (uniqueConversations.length > 0) {
        const otherUserIds = uniqueConversations.map(c => c.otherUserId);

        // Fetch user details for all these IDs
        // Note: We use 'User' table (public.User) which should store names.
        const { data: usersData, error: userError } = await supabase
            .from('User')
            .select('id, name, email, role')
            .in('id', otherUserIds);

        if (userError) {
            console.error("[Chat] User Profile Fetch Error:", userError);
        }

        if (usersData) {
            // Map user details back to conversations
            uniqueConversations.forEach(conv => {
                const userDetail = usersData.find(u => u.id === conv.otherUserId);

                if (userDetail?.role === 'Admin') {
                    conv.name = 'Main Shelter';
                } else {
                    conv.name = userDetail?.name || userDetail?.email || 'Unknown User';
                }

                conv.avatar = null; // Placeholder
            });
        }
    }

    res.json(uniqueConversations);
};
