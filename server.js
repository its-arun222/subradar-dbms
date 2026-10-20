const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', 
    database: process.env.DB_NAME || 'defaultdb',
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false } // <--- ADD THIS LINE
};

let pool;

async function initDB() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('Connected to MySQL Database (subradar_db)');
    } catch (err) {
        console.error('Database connection failed:', err.message);
    }
}
initDB();

// 0. POST Login (Authenticates against MySQL `users` table)
app.post('/api/login', async (req, res) => {
    const { email, username } = req.body;
    try {
        const [rows] = await pool.query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
        if (rows.length > 0) {
            return res.json({ user: rows[0], message: 'Authenticated via MySQL users table' });
        }
        // If user logs in with a custom name/email during viva, update user 1
        if (username && email) {
            await pool.query(`UPDATE users SET username = ?, email = ? WHERE user_id = 1`, [username, email]);
        }
        const [updated] = await pool.query(`SELECT * FROM users WHERE user_id = 1`);
        res.json({ user: updated[0], message: 'User session started' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. GET Dashboard Data (Demonstrates JOIN, SUM, COUNT, and GROUP BY)
app.get('/api/dashboard', async (req, res) => {
    try {
        const [subscriptions] = await pool.query(`
            SELECT 
                s.sub_id,
                s.service_name,
                s.cost,
                s.billing_cycle,
                DATE_FORMAT(s.next_renewal_date, '%Y-%m-%d') AS next_renewal_date,
                DATEDIFF(s.next_renewal_date, CURDATE()) AS days_left,
                s.status,
                c.category_id,
                c.category_name,
                c.color_code
            FROM subscriptions s
            INNER JOIN categories c ON s.category_id = c.category_id
            WHERE s.user_id = 1
            ORDER BY s.status ASC, s.next_renewal_date ASC
        `);

        const [statsResult] = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE 
                    WHEN status = 'Active' AND billing_cycle = 'Monthly' THEN cost
                    WHEN status = 'Active' AND billing_cycle = 'Yearly' THEN cost / 12
                    ELSE 0 
                END), 0) AS monthly_burn,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) AS active_count,
                COUNT(CASE WHEN status = 'Paused' THEN 1 END) AS paused_count
            FROM subscriptions
            WHERE user_id = 1
        `);

        const [categoryBreakdown] = await pool.query(`
            SELECT 
                c.category_name,
                c.color_code,
                COUNT(s.sub_id) AS total_items,
                COALESCE(SUM(CASE 
                    WHEN s.status = 'Active' AND s.billing_cycle = 'Monthly' THEN s.cost
                    WHEN s.status = 'Active' AND s.billing_cycle = 'Yearly' THEN s.cost / 12
                    ELSE 0 
                END), 0) AS category_monthly_spend
            FROM categories c
            LEFT JOIN subscriptions s ON c.category_id = s.category_id AND s.user_id = 1
            GROUP BY c.category_id, c.category_name, c.color_code
            ORDER BY category_monthly_spend DESC
        `);

        const [userResult] = await pool.query(`SELECT username, email, monthly_budget FROM users WHERE user_id = 1`);

        res.json({
            user: userResult[0] || { username: 'Arun', email: 'arun@mait.ac.in', monthly_budget: 4500 },
            stats: statsResult[0],
            subscriptions,
            categoryBreakdown
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed. Ensure schema.sql is imported.' });
    }
});

// 2. PATCH Update Monthly Budget in MySQL
app.patch('/api/budget', async (req, res) => {
    const { monthly_budget } = req.body;
    try {
        await pool.query(`UPDATE users SET monthly_budget = ? WHERE user_id = 1`, [monthly_budget]);
        res.json({ message: 'Budget updated in MySQL' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. GET Categories
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM categories ORDER BY category_id ASC`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. POST Add New Subscription
app.post('/api/subscriptions', async (req, res) => {
    const { service_name, category_id, cost, billing_cycle, next_renewal_date } = req.body;
    try {
        await pool.query(
            `INSERT INTO subscriptions (user_id, category_id, service_name, cost, billing_cycle, next_renewal_date, status)
             VALUES (1, ?, ?, ?, ?, ?, 'Active')`,
            [category_id, service_name, cost, billing_cycle, next_renewal_date]
        );
        res.json({ message: 'Subscription added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. PATCH Toggle Active/Paused Status
app.patch('/api/subscriptions/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query(`UPDATE subscriptions SET status = ? WHERE sub_id = ? AND user_id = 1`, [status, id]);
        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. DELETE Subscription
app.delete('/api/subscriptions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`DELETE FROM subscriptions WHERE sub_id = ? AND user_id = 1`, [id]);
        res.json({ message: 'Subscription deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});