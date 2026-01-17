const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.set('etag', false); // Disable 304 responses
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});
app.use(cors());
app.use(morgan("dev"));
app.use(helmet());
app.use(compression());

// Routes
// Routes
const supabase = require('./src/config/supabaseClient');
const petRoutes = require('./src/routes/petRoutes');
const userRoutes = require('./src/routes/userRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const donationRoutes = require('./src/routes/donationRoutes');
const productRoutes = require('./src/routes/productRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const initSocket = require('./src/socket');
const http = require('http');

app.use('/api/pets', petRoutes);
app.use('/api/user', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/shop', productRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/activities', require('./src/routes/activityRoutes'));

// Test Route
app.get("/", async (req, res) => {
    const { data, error } = await supabase.from('Pet').select('count', { count: 'exact', head: true });

    if (error) {
        return res.status(500).json({ message: "PAWS Backend Running", dbStatus: "Error connecting to Supabase", error: error.message });
    }

    res.json({ message: "PAWS Backend Running 🐾", dbStatus: "Connected to Supabase" });
});

const server = http.createServer(app);
const io = initSocket(server);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
