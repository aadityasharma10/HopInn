if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

console.log("ATLASDB_URL:", process.env.ATLASDB_URL);
console.log("SECRET:", process.env.SECRET);
console.log("MAP_TOKEN:", process.env.MAP_TOKEN);

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const User = require('./models/user.js');
const Listing = require('./models/listing.js');
const ExpressError = require('./utils/ExpressError.js');
const listingRouter = require('./routes/listing.js');
const reviewRouter = require('./routes/review.js');
const userRouter = require('./routes/user.js');

const app = express();

// MongoDB connection
const dbUrl = process.env.ATLASDB_URL;
mongoose.set('strictQuery', true);

async function main() {
  await mongoose.connect(dbUrl);
}
main()
  .then(() => console.log('Connected to DB'))
  .catch(err => console.log(err));

// EJS templating and middleware
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session store
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: { secret: process.env.SECRET },
  touchAfter: 24 * 3600,
});
store.on('error', err => console.log('SESSION STORE ERROR:', err));

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};
app.use(session(sessionOptions));
app.use(flash());

// Passport setup
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Make flash messages and current user available in all templates
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currUser = req.user;
  next();
});

// --- Homepage route with latest listings ---
app.get('/', async (req, res) => {
  const listings = await Listing.find({}).limit(8); // Show 8 latest listings
  res.render('home', { listings });
});

// Routes
app.use('/listings', listingRouter);
app.use('/listings/:id/reviews', reviewRouter);
app.use('/', userRouter);

// 404 handler
app.all('*', (req, res, next) => {
  next(new ExpressError(404, 'Page not found!'));
});

// Error handler
app.use((err, req, res, next) => {
  const { statusCode = 500, message = 'Something went wrong!' } = err;
  res.status(statusCode).render('error', { message });
});

// Start server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
