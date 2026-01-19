const supabase = require('../config/supabaseClient');
const { createNotification } = require('../controllers/notificationController');

const initDbListener = (io) => {
    console.log('[DB Listener] Initializing Supabase Realtime listener...');

    supabase
        .channel('pet-status-changes')
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'Pet' },
            async (payload) => {
                const newRecord = payload.new;
                // const oldRecord = payload.old; // Often only contains ID

                console.log(`[DB Listener] Pet update detected: ${newRecord.id}, Status: ${newRecord.status}`);

                const ownerId = newRecord.ownerId;

                // Always update UI for owner
                if (io) {
                    io.to(ownerId).emit('pet_updated', newRecord);
                }

                // Check if status is 'Stray' (Approved)
                if (newRecord.status === 'Stray') {

                    // Check if we already notified for this pet
                    const { data: existingNotif } = await supabase
                        .from('Notification')
                        .select('id')
                        .eq('userId', ownerId)
                        .eq('type', 'pet_status')
                        .contains('data', { petId: newRecord.id })
                        .maybeSingle();

                    if (existingNotif) {
                        // Already notified, skip to avoid spam on every edit
                        return;
                    }

                    const title = 'Pet Listed!';
                    const message = `Your pet "${newRecord.name}" is now visible on the home feed.`;

                    // Realtime Socket (Send FIRST for speed)
                    if (io) {
                        io.to(ownerId).emit('new_notification', {
                            type: 'pet_status',
                            title,
                            message,
                            data: { petId: newRecord.id }
                        });
                        console.log(`[DB Listener] Notification sent to ${ownerId}`);
                    }

                    // Create Notification (Async)
                    await createNotification(ownerId, 'pet_status', title, message, { petId: newRecord.id });
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'Appointment' },
            async (payload) => {
                const newRecord = payload.new;
                console.log(`[DB Listener] Appointment update: ${newRecord.id}`);

                const userId = newRecord.userId;

                // Throttle
                const oneMinAgo = new Date(Date.now() - 60000).toISOString();
                const { data: recentNotif } = await supabase
                    .from('Notification')
                    .select('id')
                    .eq('userId', userId)
                    .eq('type', 'appointment_update')
                    .contains('data', { appointmentId: newRecord.id })
                    .gt('createdAt', oneMinAgo)
                    .maybeSingle();

                if (recentNotif) return;

                const title = 'Appointment Update';
                const dateStr = new Date(newRecord.date).toLocaleDateString();
                const message = `Your appointment on ${dateStr} has been updated. Check details.`;

                if (io) {
                    io.to(userId).emit('new_notification', {
                        type: 'appointment_update',
                        title,
                        message,
                        data: { appointmentId: newRecord.id }
                    });
                    console.log(`[DB Listener] Appointment Notification sent to ${userId}`);
                }

                await createNotification(userId, 'appointment_update', title, message, { appointmentId: newRecord.id });
            }
        )
        .subscribe((status) => {
            console.log(`[DB Listener] Subscription status: ${status}`);
        });
};

module.exports = initDbListener;
