const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const connectEnsureLogin = require('connect-ensure-login');// authorization
const passport = require('passport');  // authentication
const LocalStrategy = require('passport-local').Strategy;

const LowdbStore = require('lowdb-session-store')(session);
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapterAuth = new FileSync('auth.json');
const dbAuth = lowdb(adapterAuth);

// passport needs ability to serialize and unserialize users out of session
passport.serializeUser(function (user, done) {
  done(null, user['id']);
});

passport.deserializeUser(function (id, done) {
  var userObj = dbAuth.get("users").find({ id: id }).value();
  if (userObj == null) {
    return done(null, false);
  }
  done(null, userObj);
});

// passport local strategy for local-login, local refers to this app
passport.use('local-login', new LocalStrategy(
  function (username, password, done) {
    var userObj = dbAuth.get("users").find({ username: username }).value();
    if (userObj == null) {
      return done(null, false);
    }
    else {
      if (userObj['password'] == password) {
        return done(null, userObj);
      }
    }
    return done(null, false);
  })
);

const app = express();

// body-parser for retrieving form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// initialize passposrt and and session for persistent login sessions
app.use(session({
  secret: "tHiSiSasEcRetStr",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


app.get("/", function (req, res) {
  res.redirect('/login');
});

app.get('/mustlogin', (req, res) => {
  res.send(`Hello friend, you really must be logged in to see this.<br><br>
  <a href="/login">Log In</a>`);
});

// api endpoints for login, content and logout
app.get("/login", function (req, res) {
  res.send("<p>Please login!</p><form method='post' action='/login'><input type='text' name='username'/><input type='password' name='password'/><button type='submit' value='submit'>Submit</buttom></form>");
});

app.post("/login",
  passport.authenticate("local-login", { failureRedirect: "/failed" }),
  function (req, res) {
    res.redirect("/content");
  });

// api endpoints for login, content and logout
app.get("/failed", function (req, res) {
  res.send("<p>Wrong username or password!</p><br><a href='/login'>Login</a>");
});

app.get("/content", connectEnsureLogin.ensureLoggedIn('/mustlogin'), function (req, res) {
  // console.log(req);
  res.write(`<h1>Hello ${req.user.username} </h1><br>`);
  res.write('Congratulations! You are logged in.<br>');
  res.end('<a href=' + '/logout' + '>Click here to log out</a>');
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect('/login');
});

// launch the app
app.listen(process.env.PORT || 3000, () => {
  console.log(`App Started on PORT ${process.env.PORT || 3000}`);
});