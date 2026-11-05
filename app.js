import express from 'express'
import session from "express-session"
import {
    engine
} from 'express-handlebars'
import bcrypt from "bcryptjs"
import path from 'path'
import dotenv from 'dotenv'
import pool from './db.js'
import {
    fileURLToPath
} from 'url'

dotenv.config()

const app = express()
const port = process.env.PORT
app.use(express.static("public"))
app.use(express.urlencoded({
    extended: true
}))

// tambahkan pembaca partials file -> partials = file kecil2 yang berguna seperti lego
// untuk membangun menu, web , dan utilitas
const __filename = fileURLToPath(
    import.meta.url)
const __dirname = path.dirname(__filename)
app.engine('handlebars', engine({
    extname: '.handlebars',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: [
        path.join(__dirname, 'views/admin'),
        path.join(__dirname, 'views/user'),
        path.join(__dirname, 'views/cashier'),
        path.join(__dirname, 'views/warehouse'),
    ],
    defaultLayout: 'main'
}))

app.set('view engine', 'handlebars')
app.set('views', './views')

app.use(
    session({
        name: process.env.SESSION_NAME,
        secret: process.env.SESSION_SECRET_KEY,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 100 * 60 * 30
        }
    })
)

app.use((req, res, next) => {
    res.locals.user = req.session.user || null
    next()
})

function requireAuth(req, res, next) { // middleware
    if (!req.session.user) {
        return res.redirect("/login") // kalau belom login balikin usernya ke halaman login
    }

    next()
}

function checkRole(role) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect("/login");
        }
        if (req.session.user.role !== role) {
            return res.status(403).send("Forbidden Access! Your role is not match!");
        }
        next();
    }
}
app.get("/", (req, res) => {
    res.render("index", {
        title: "Halaman Index"
    })
})

app.get("/login", (req, res) => {
    res.render("login", {
        title: "Halaman login"
    })
})

app.post("/login", async (req, res, next) => {
    try {
        const {
            email,
            password
        } = req.body;

        const [rows] = await pool.query(
            "SELECT * FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).send("Email atau password salah!");
        }

        const user = rows[0];
        console.log(user)
        const validPass = await bcrypt.compare(password, user.password);

        if (!validPass) {
            return res.status(401).send("email atau password salah!");
        }

        req.session.regenerate((err) => {
            if (err) return next(err);

            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            };

            req.session.save((err) => {
                if (err) return next(err);

                return res.redirect("/home");
            });
        });
    } catch (err) {
        next(err);
    }
});

app.get("/home", requireAuth, (req, res) => {
    if (req.session.user.role === "admin") {
        return res.redirect("/admin")
    } else if (req.session.user.role === "user") {
        return res.redirect("/user")
    } else if (req.session.user.role == "cashier") {
        return res.redirect("/cashier")
    } else if (req.session.user.role == "warehouse") {
        return res.redirect("/warehouse")
    } else {
        console.log("Role = " + req.session.user.role)
        return res.redirect("/login");
    }
});

// role based route
// Admin start
app.get("/admin", checkRole('admin'), (req, res) => {
    res.render('admin/home', {
        title: "Admin Page",
        role: "admin",
        nav: "admin-nav"
    })
})

app.get("/admin/stock/manage", checkRole('admin'), async (req, res) => {
    try {
        const [stocks] = await pool.execute("SELECT * FROM products");
        res.render("admin/manage-stock", {
            title: "Manage Stock",
            role: "admin",
            nav: "admin-nav",
            stocks
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});   

app.post("/admin/stock/manage", checkRole('admin'), async (req, res) => {
    try {
        const {
            sku,
            p_name,
            price,
            stock
        } = req.body;
        if (!sku || !p_name || price == null || stock == null) {
            return res.status(400).redirect("/admin/stock/manage?error=invalid");
        }
        console.log(`Request body ${req.body}`)
        const [result] = await pool.execute(
            "INSERT INTO products (sku, p_name, price, stock) VALUES (?, ?, ?, ?)",
            [sku, p_name, Number(price), Number(stock)]
        );
        res.redirect("/admin/stock/manage")
    } catch (err) {
        console.error("Something went wrong ", err);
        res.status(500).redirect("/admin/stock/manage?error=1");
    }
})
// Admin end

app.get("/user", checkRole('user'), (req, res) => {
    res.render('user/home', {
        title: "user Page",
        role: "user",
    })
})


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})