const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const port = process.env.PORT || 3000;
require("dotenv").config();

const DATABASE_URI = process.env.MONGODB_URI;
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const mongoDBStore = require("connect-mongodb-session")(session);
const errorController = require("./controllers/error");

const User = require("./models/user");
const store = new mongoDBStore(
	{
		uri: DATABASE_URI,
		collection: "sessions"
	},
	err => {
		console.log(err);
	}
);

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const shopRoutes = require("./routes/shop");


app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
	session({
		secret: "giftkart",
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 1000 * 60 * 60 // 1 hour
		},
		store: store
	})
);

app.use((req, res, next) => {
	if (!req.session.user) {
		return next();
	}
	User.findById(req.session.user._id)
		.then(user => {
			if (!user) {
				return next();
			}
			req.user = user;
			next();
		})
		.catch(err => {
			throw new Error(err);
		});
});

app.use((req, res, next) => {
	res.locals.isAuthenticated = req.session.isLoggedIn;
	res.locals.isAdmin = req.session.isAdmin;
	next();
});

app.use("/admin", adminRoutes);
app.use(authRoutes);
app.use(shopRoutes);
app.use(errorController.get404);

mongoose
	.connect(DATABASE_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true
	})
	.then(result => {
		console.log("Connected to database successfully!");
		app.listen(port, () => console.log("server started..."));
	})
	.catch(err => console.log(err));
