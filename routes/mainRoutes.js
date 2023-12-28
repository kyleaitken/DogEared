const req = require('express/lib/request');
var url = require('url');
const https = require('https');
const session = require('express-session');
const { render } = require('express/lib/response');
const { parse, resolve } = require('path');
const res = require('express/lib/response');
var sqlite3 = require('sqlite3').verbose(); //verbose provides more detailed stack trace
const db = new sqlite3.Database('data/books.db');
const apiKey = 'AIzaSyBHYwiyZy4Ah6jcRY7E98TAzBI5qocXC6g'

// Parses the URL
function parseURL(request, response){
	var parseQuery = true; //parseQueryStringIfTrue
    var slashHost = true; //slashDenoteHostIfTrue
    var urlObj = url.parse(request.url, parseQuery , slashHost );
    console.log('path:');
    console.log(urlObj.path);
    console.log('query:');
    console.log(urlObj.query);
    //for(x in urlObj.query) console.log(x + ': ' + urlObj.query[x]);
	return urlObj;
}

exports.login = function (request, response) {
	// destroy previous session if there is one
	request.session.destroy((err) => {
		if (err) console.error(err);
	});
	response.render('login', {layout: 'loginLayout'});
}


exports.register = function (request, response) {
	response.render('register', {layout: 'loginLayout'});
}


// Registers a new user, adds them to the database
exports.registerUser = function (request, response) {

	const data = request.body;
    const username = data.username;
    const password = data.password;

	let sqlString = `INSERT INTO users (username, password, type) VALUES ('${username}', '${password}', 'guest')`;
	db.run(sqlString, function (err) {
		if (err) {
			console.log('Error registering user:', err);
			response.status(500).json({ error: 'Internal Server Error' });
		} else {
			console.log('User registered successfully!');
			response.redirect('/login');
		}

		response.end();
	});

}	


// Attempts to authenticate the user from the user database
exports.authenticate = function (request, response) {
	// check if user is in data base 
	const data = request.body;
	const username = data.username;
	const password = data.password;

	// rest of your code
	let sqlString = `SELECT username, password, type FROM users WHERE username = '${username}'`
	db.all(sqlString, (err, rows) => {
		if (err) {
			console.error(err);
			response.status(500).json({ error: 'Internal Server Error' });
			return;
		}

		if (rows.length > 0 && rows[0].password === password) {
			console.log('found user')
			const userType = rows[0].type;
			if (userType === 'admin') {
				request.session.isAdmin = true;
			} else {
				request.session.isAdmin = false;
			}
			request.session.isLoggedOn = true;
			request.session.username = username;
			console.log("request session username added: " + username)
			
			console.log('valid user')
			response.status(200).send('Successful login');
		} else {
			// not authenticated
			console.log("Invalid username or password")
			response.status(401).json({error: "Invalid username and password"})
		}
	})

}


// Ensures the user is logged in according to session data, re-routes to login if not
exports.requireLogin = function (request, response, next) {
	if (request.session.username) {
		console.log('redirecting to home')
		next();
	  } else {
		console.log('redirecting to login')
		response.redirect('/login'); // user is not logged in, redirect to login page
	}
}


exports.users = function(request, response) {
	if (request.session.username) {
		// check if admin
		if (request.session.isAdmin) {
			// get user information from DB
			let sqlString = "SELECT * from users"
			db.all(sqlString, (err, rows) => {
				if (err) {
					console.error(err);
					response.status(500).send('Error Retrieving Users')
				} else {
					response.render('users', {users: rows});
				}				
			});
		} else {
			console.log('unable to view users')
			response.status(401).send("You are not authorized to view this page");
		}
	} else {
		response.redirect('/login');
	}
}


// Shows the user their favourite books list
exports.myBooks = function (request, response) {
	console.log("rendering mybooks page")

	// get userID from session
	const userID = request.session.username;

	let sqlString = `SELECT books.bookid, books.thumbnail, books.title, books.author from books 
		JOIN userbooks on userbooks.bookid = books.bookid 
		where userbooks.userid = '${userID}'`
	db.all(sqlString, (err, rows) => {
		if (err) {
			console.error(err);
			response.status(500).json({ error: 'Internal Server Error' });
			return;
		}

		if (rows.length > 0) {
			// render user's favourites 
			console.log("user has favourite books logged");
			console.log(rows);
			response.render('mybooks', { myBooks: rows });

		} else {
			console.log("user has no favourites");
			response.render('mybooks', {myBooks: []});
		}
	})
	

}



exports.removeFavourite = function (request, response) {
	const bookID = request.params.bookID;
	const userID = request.session.username;
	console.log(request.url);
	
	console.log('remove favourites route');
	console.log('book id: ' + bookID);
	console.log('username: ' + userID);

	// remove from database and favourites in session log

	let sqlString = `DELETE FROM userbooks where userid = '${userID}' and bookid = '${bookID}'`;
	db.run(sqlString, function (err) {
		if (err) {
			console.log('Error removing book from favorites:', err);
			response.status(404).json({ error: 'Book not found' });
		  } else {
			console.log('User registered successfully!');
			response.status(200).json({message: 'Book remove from favourites'});
		  }
	});
	
}