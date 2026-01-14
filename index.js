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
app.use(cors());
app.use(morgan("dev"));
app.use(helmet());
app.use(compression());

// Routes
const supabase = require('./src/config/supabaseClient');
const petRoutes = require('./src/routes/petRoutes');
const userRoutes = require('./src/routes/userRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const donationRoutes = require('./src/routes/donationRoutes');
const productRoutes = require('./src/routes/productRoutes');

app.use('/api/pets', petRoutes);
app.use('/api/user', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/shop', productRoutes);

// Test Route
app.get("/", async (req, res) => {
    const { data, error } = await supabase.from('Pet').select('count', { count: 'exact', head: true });

    if (error) {
        return res.status(500).json({ message: "PAWS Backend Running", dbStatus: "Error connecting to Supabase", error: error.message });
    }

    res.json({ message: "PAWS Backend Running 🐾", dbStatus: "Connected to Supabase" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
