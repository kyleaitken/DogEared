/*


*/

const http = require('http');
const express = require('express');
const session = require('express-session');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const hbs = require('hbs') //now we need this to do partials
const SQLiteStore = require('connect-sqlite3')(session);
const sessionStore = new SQLiteStore();
const bodyParser = require('body-parser');




const  app = express(); //create express middleware dispatcher

const PORT = process.env.PORT || 3000

// view engine setup
hbs.registerPartials(__dirname + '/views/partials')
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs'); //use hbs handlebars wrapper

app.locals.pretty = true; //to generate pretty view-source code in browser

//read routes modules
const routes = require('./routes/mainRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { acceptsLanguages } = require('express/lib/request');


//middleware
//app.use(methodLogger);
// app.use(routes.authenticate); //authenticate user
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
	store: sessionStore,
	secret: 'your-secret-key',
	resave: false,
	saveUninitialized: false,
	cookie: { maxAge: 60 * 60 * 1000 }, // 1 hour expiry
}));


// get routes
app.get('/', routes.requireLogin, apiRoutes.updateHome); 
app.get('/login', routes.login);
app.get('/register', routes.register);
app.get('/users', routes.users);
app.get('/mybooks', routes.myBooks);

// post routes
app.post('/authenticate', routes.authenticate);
app.post('/registerUser', routes.registerUser);


// api routes
app.get('/book/*', apiRoutes.bookDetails);
app.get('/searchBooks', apiRoutes.searchBooks);
app.get('/addFavourite/*', apiRoutes.addFavourite);
app.post('/updateHome', apiRoutes.updateHome);
app.post('/new_releases', apiRoutes.updateHome);
app.post('/best_sellers', apiRoutes.updateHome);


// delete
app.delete('/removeFavourite/:bookID', routes.removeFavourite);





//start server
app.listen(PORT, err => {
  if(err) console.log(err)
  else {
		console.log(`Server listening on port: ${PORT} CNTL:-C to stop`)
		console.log(`To Test:`)
		console.log('Login/Register at http://localhost:3000')
		console.log('http://localhost:3000/home')
		console.log('http://localhost:3000/users')
	}
})