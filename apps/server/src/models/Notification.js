import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error'],
        default: 'info'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    visible: {
        type: Boolean,
        default: true
    },
    data: {
        type: Object, // For any extra metadata like recordId, link, etc.
        default: {}
    },
    readAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries by recipient and date
notificationSchema.index({ recipient: 1, createdAt: -1 });

// TTL Index: Delete documents 5 days (432000 seconds) after 'readAt' is set
notificationSchema.index({ readAt: 1 }, { expireAfterSeconds: 432000 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
