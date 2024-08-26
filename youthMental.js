import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import autenticationRoute from './routes/authRoutes.js';
import { db } from './config/dbConfig.js';

dotenv.config();
const app = express();

app.use(cors());

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.header('ACCESS-CONTROL-ALLOW-METHODS', 'PUT, POST, PATCH, GET, DELETE');
        return res.status(200).json({});
    }
    next();
});

app.post('/contact', (req, res) => {
    const { name, email, message } = req.body;
    const sql = 'INSERT INTO ContactUs (name, email_id, message) VALUES (?, ?, ?)';
    db.query(sql, [name, email, message], (err, result) => {
        if (err) {
            console.error('Error inserting into ContactUs table:', err);
            res.status(500).json({ status: 500, message: 'Failed to insert into ContactUs table' });
            return;
        }
        console.log('Inserted into ContactUs table:', result);
        res.status(200).json({ status: 200, message: 'Contact details inserted successfully' });
    });
});


// POST Route: Create a new booking
app.post('/booking', (req, res) => {
    const { user_id, booking_time, booking_date, additional_notes } = req.body;

    const sql = `
        INSERT INTO booking (user_id, booking_time, booking_date, additional_notes)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [user_id, booking_time, booking_date, additional_notes], (err, result) => {
        if (err) {
            console.error('Error inserting into booking table:', err);
            res.status(500).json({ status: 500, message: 'Failed to insert into booking table' });
            return;
        }
        console.log('Inserted into booking table:', result);
        res.status(200).json({ status: 200, message: 'Booking created successfully', booking_id: result.insertId });
    });
});

// GET Route: Retrieve all bookings with user details and badge color
app.get('/booking', (req, res) => {
    const sql = `
        SELECT 
            b.booking_id, 
            b.user_id, 
            u.email,
            CONCAT(u.first_name, ' ', u.last_name) AS full_name,
            u.condition,
            u.color AS user_color,
            b.booking_time, 
            b.booking_date, 
            b.additional_notes,
            b.status,
            COALESCE(bg.badge_color, 'None') AS badge_color
        FROM 
            booking b
        JOIN 
            user u ON b.user_id = u.user_id
        LEFT JOIN 
            badge_assign ba ON u.user_id = ba.user_id
        LEFT JOIN 
            badge bg ON ba.badge_id = bg.badge_id
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching bookings from booking table:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch bookings' });
            return;
        }
        res.status(200).json({ status: 200, bookings: results });
    });
});


// Get a specific booking by booking_id
app.get('/booking/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM booking WHERE booking_id = ?';

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching booking from booking table:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch booking' });
            return;
        }
        if (result.length === 0) {
            res.status(404).json({ status: 404, message: 'Booking not found' });
        } else {
            res.status(200).json({ status: 200, booking: result[0] });
        }
    });
});

// PUT Route: Update the status of a booking
app.put('/booking/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ status: 400, message: 'Status is required' });
    }

    const sql = 'UPDATE booking SET status = ? WHERE booking_id = ?';

    db.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error('Error updating booking status:', err);
            res.status(500).json({ status: 500, message: 'Failed to update booking status' });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ status: 404, message: 'Booking not found' });
        } else {
            res.status(200).json({ status: 200, message: 'Booking status updated successfully' });
        }
    });
});

// POST Route: Assign a badge to a user
app.post('/badge-assign', (req, res) => {
    const { user_id, badge_id } = req.body;

    if (!user_id || !badge_id) {
        return res.status(400).json({ status: 400, message: 'User ID and Badge ID are required' });
    }

    // First, check if the user already has a badge assigned
    const checkSql = 'SELECT * FROM badge_assign WHERE user_id = ?';
    
    db.query(checkSql, [user_id], (err, results) => {
        if (err) {
            console.error('Error checking badge assignment:', err);
            return res.status(500).json({ status: 500, message: 'Failed to check badge assignment' });
        }

        if (results.length > 0) {
            // If a record exists, update it
            const updateSql = 'UPDATE badge_assign SET badge_id = ? WHERE user_id = ?';
            db.query(updateSql, [badge_id, user_id], (err) => {
                if (err) {
                    console.error('Error updating badge assignment:', err);
                    return res.status(500).json({ status: 500, message: 'Failed to update badge assignment' });
                }
                res.status(200).json({ status: 200, message: 'Badge updated successfully' });
            });
        } else {
            // If no record exists, insert a new one
            const insertSql = 'INSERT INTO badge_assign (user_id, badge_id) VALUES (?, ?)';
            db.query(insertSql, [user_id, badge_id], (err, result) => {
                if (err) {
                    console.error('Error assigning badge:', err);
                    return res.status(500).json({ status: 500, message: 'Failed to assign badge' });
                }
                res.status(201).json({ status: 201, message: 'Badge assigned successfully', badge_assign_id: result.insertId });
            });
        }
    });
});


// GET Route: Retrieve all badges
app.get('/badges', (req, res) => {
    const sql = 'SELECT * FROM badge';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching badges from badge table:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch badges' });
            return;
        }
        res.status(200).json({ status: 200, badges: results });
    });
});

// GET Route: Retrieve all bookings for a specific user
app.get('/user-bookings/:user_id', (req, res) => {
    const userId = req.params.user_id;

    const sql = `
        SELECT 
            b.booking_id, 
            b.user_id, 
            u.email,
            CONCAT(u.first_name, ' ', u.last_name) AS full_name,
            u.condition,
            u.color,
            b.booking_time, 
            b.booking_date, 
            b.additional_notes,
            b.status
        FROM 
            booking b
        JOIN 
            user u ON b.user_id = u.user_id
        WHERE 
            b.user_id = ?
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user bookings:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch bookings' });
            return;
        }
        res.status(200).json({ status: 200, bookings: results });
    });
});

app.post('/motivation-stories', (req, res) => {
    const { title, user_id, content } = req.body;

    if (!title || !user_id || !content) {
        return res.status(400).json({ status: 400, message: 'Title, User ID, and Content are required' });
    }

    const sql = 'INSERT INTO motivation_stories (title, user_id, content) VALUES (?, ?, ?)';
    db.query(sql, [title, user_id, content], (err, result) => {
        if (err) {
            console.error('Error inserting into motivation_stories table:', err);
            return res.status(500).json({ status: 500, message: 'Failed to insert into motivation_stories table' });
        }
        console.log('Inserted into motivation_stories table:', result);
        res.status(201).json({ status: 201, message: 'Motivational story created successfully', story_id: result.insertId });
    });
});

app.get('/motivation-stories', (req, res) => {
    const sql = `
        SELECT 
            ms.story_id, 
            ms.title, 
            ms.content, 
            ms.created_at, 
            u.user_id, 
            CONCAT(u.first_name, ' ', u.last_name) AS author_name 
        FROM 
            motivation_stories ms
        JOIN 
            user u ON ms.user_id = u.user_id
        ORDER BY 
            ms.created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching stories from motivation_stories table:', err);
            return res.status(500).json({ status: 500, message: 'Failed to fetch motivational stories' });
        }
        res.status(200).json({ status: 200, stories: results });
    });
});


app.use('/ymhs/autenticate', autenticationRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server connected to port ${PORT}`);
});
