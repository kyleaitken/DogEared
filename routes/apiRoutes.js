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


// Shows the specific book information
exports.bookDetails = function(request, response){
    console.log('in book details');
    const urlObj = parseURL(request, response);
    let bookID = urlObj.path; //expected form: /song/235
    bookID = bookID.substring(bookID.lastIndexOf("/")+1, bookID.length);
    
    console.log(bookID);

    // check if book already stored in session
    var bookObj;
    let bookStoredAlready = false;
    if (request.session?.bookData) {
        storedBook = request.session.bookData[bookID];
        console.log(storedBook);
        if (typeof storedBook !== "undefined") {
            bookObj = storedBook;
            bookStoredAlready = true;
            console.log('book already stored');
            console.log(bookObj);
            response.render('book', {book: bookObj});
        } 
    } 
    if (!bookStoredAlready) {
        // get from API
        console.log('getting book from API')

        // Send HTTP request for that book and load page

        const apiUrl = `https://www.googleapis.com/books/v1/volumes/${bookID}`;

        https.get(apiUrl, (apiRes) => {
            let apiData = '';
            apiRes.on('data', (chunk) => {
                apiData += chunk;
            });
            apiRes.on('end', () => {
                bookObj = JSON.parse(apiData);
                console.log("book info:")
                console.log(bookObj);

                const bookDescription = bookObj.volumeInfo.description;
                const strippedDescription = bookDescription.replace(/(<([^>]+)>)/gi, "");
                bookObj.volumeInfo.description = strippedDescription;

                // Initialize book dictionary for session if it doesn't exist
                if (!request.session.bookData) {
                    request.session.bookData = {};
                }
                request.session.bookData[bookID] = bookObj;
                console.log("stored book in session ")
                console.log(request.session.bookData[bookID])

                response.render('book', {book: bookObj});
            });
        }).on('error', (err) => {
                console.error(err);
                response.status(500).send('Error getting book from API');
        });
    }
}

// Updates the home page with the correct content type, either best sellers or new releases 
exports.updateHome = async function(request, response) {
	console.log("updating home page route")
	let contentType;
	let body = '';

	if (request.body) {
		console.log('request has a body');
		if (request.body.homeContent) {
			console.log('request has home content property')
			contentType = request.body.homeContent;
		} else {
			contentType = 'Best Sellers'
		}
	} else {
		contentType = 'Best Sellers';
	}

	console.log(contentType);

	try {
		const resultArray = await getHomePageContent(contentType);
		console.log('back from render home')
		console.log(resultArray)
		// response.status(200);
		response.render('home', { homeContent: resultArray, contentHeader: contentType });

	} catch (error) {
		console.log('error updating home');
		response.status(500).json({ error: 'Internal Server Error' });
		return;
	}
	
}


// Gets the home page content from the API, either best sellers or new releases depending on the specified contentType
async function getHomePageContent(contentType) {
	let apiURL;
	if (contentType === 'Best Sellers') {
		apiURL = `https://www.googleapis.com/books/v1/volumes?q=best+sellers&orderBy=newest&maxResults=40&key=${apiKey}`;
	} else {
		apiURL = `https://www.googleapis.com/books/v1/volumes?q=new+releases&orderBy=relevance&maxResults=40&key=${apiKey}`;
	}

	return new Promise((resolve, reject) => {
		https.get(apiURL, (apiRes) => {
			let apiData = '';
			apiRes.on('data', (chunk) => {
			apiData += chunk;
			});
			apiRes.on('end', () => {
			const homeContent = JSON.parse(apiData);
			let booksArray;
			if (homeContent && homeContent.items) {
				booksArray = homeContent.items;
			} else {
				reject('Error getting home content');
			}
			const resultArray = [];

			for (let i = 0; i < booksArray.length; i += 4) {
				resultArray.push([booksArray[i], booksArray[i + 1], booksArray[i + 2], booksArray[i + 3]]);
			}
			// create rows of 2 books
			resolve(resultArray);
			}).on('error', (err) => {
				console.error(err);
				reject(`Error getting ${contentType}`);
			});
		});

	})
}


// Searches the Google Books API and displays them to the user
exports.searchBooks = function (request, response) {
	const urlString = request.url;
	const parsedUrl = url.parse(urlString, true);
	const encodedQuery = parsedUrl.query.q;
	const query = decodeURIComponent(encodedQuery);

	console.log(query); 
	
	// Construct the API request URL
	const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&key=${apiKey}`;

	// Send the API request and handle the response
	fetch(apiUrl)
	.then(response => response.json())
	.then(data => {
		// Handle the data returned by the API
		console.log(data);
		data.searchString = query;
		if (data.totalitems != 0) {
			console.log(data.items)
			response.render('searchBooks', { searchResults: data.items });
		} else {
			console.log('no books found');
			response.render('searchBooks', { searchResults: [] });
		}

	})
	.catch(error => {
		// Handle any errors that occur
		console.error(error);
	});
}


/* 
Adding/Removing to Favourites Functions
*/

// retrieves the book information from the Google Books API associated with an ID
async function getBookByID(bookID) {
	const apiUrl = `https://www.googleapis.com/books/v1/volumes/${bookID}`;

	return new Promise((resolve, reject) => {
		https.get(apiUrl, (apiRes) => {
			let apiData = '';
			apiRes.on('data', (chunk) => {
				apiData += chunk;
			});
			apiRes.on('end', () => {
				const bookObj = JSON.parse(apiData);
				resolve(bookObj);
			});
		}).on('error', (err) => {
			console.error(err);
			reject('Error getting book from API');
		});
	});
}


// check if book already in users favourites, if so, alert user, otherwise add it
async function checkFavourites(username, bookID) {
	console.log('in check favs')

	return new Promise((resolve, reject) => {
		let sqlString = `Select userid, bookid from userbooks where userid = '${username}' AND bookid = '${bookID}'`

		db.all(sqlString, (err, rows)  => {
			if (err) {
				console.log(err)
				reject(err);
			} else if (rows.length > 0) {
				console.log('book already in user favourites');
				resolve(true);
			} else {
				// add book to user's favourites
				console.log("book not in user's favourites - adding");
				sqlString = `INSERT INTO userbooks (userid, bookid) values ('${username}', '${bookID}')`
				db.run(sqlString, (err, rows) => {
					if (err) {
						console.log(err);
						reject(err);
					} else {
						console.log('added book to user\'s favourites');
						resolve(false);
					}
				});
			}
		})
	})

}


// check if book in DB 
async function checkDBForBook(bookID, bookObj) {
	return new Promise((resolve, reject) => {
		console.log('in check for DB')
		console.log('book id: ' + bookID)
		console.log('book obj: ' + bookObj);

		let sqlString = `SELECT bookid from books where bookid = '${bookID}'`;
		db.all(sqlString, (err, rows) => {
			if (err) {
				console.log('error checking DB for book')
				console.log(err)
			} else if (rows.length > 0) {
				console.log('book already in DB')
				resolve(true);	
			} else {
				console.log("book not in DB, adding")
				const bookData = bookObj.volumeInfo;
				var genre;
				if (bookData.categories) {
					genre = bookData.categories[0];
				} else {
					genre = 'N/A'
				}
				const title = bookData.title;
				const subTitle = bookData.subtitle;
				const author = bookData.authors[0];
				const release = bookData.publishedDate;
				const pagecount = bookData.pageCount;
				const lang = bookData.language;
				const thumbnail = bookData.imageLinks.thumbnail;
	
				// replace html in book description text 
				const description = bookData.description.replace(/(<([^>]+)>)/gi, "");
				const values = [bookID, genre, title, subTitle, author, release, pagecount, lang, thumbnail, description];
				let nextSqlString = "INSERT INTO books (bookid, genre, title, subtitle, author, release, pagecount, language, thumbnail, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);"
				db.run(nextSqlString, values, function(err) {
					if (err) {
						console.log('error adding book to DB')
						reject(err);
					} else {
						console.log('added book to DB') 
						resolve(false);	
					}
				})
			}
		})

	})
	
}



// Attempts to add the book to the user's favourite books list
exports.addFavourite = async function (request, response) {
	const urlObj = parseURL(request, response);
	let bookID = urlObj.path; //expected form: /song/235
	bookID = bookID.substring(bookID.lastIndexOf("/")+1, bookID.length);
	
	console.log('add favourites route');
	console.log('book id: ' + bookID);

	var bookObj;
	let bookStoredAlready = false;
	if (request.session?.bookData) {
		storedBook = request.session.bookData[bookID];
		if (typeof storedBook !== "undefined") {
			bookObj = storedBook;
			bookStoredAlready = true;
			console.log('book already stored');
			console.log(bookObj);
		}
	} 
	if (!bookStoredAlready){
		// get from API
		console.log('getting book from API')
		bookObj = await getBookByID(bookID);
		console.log(bookObj)
	}

	// get userID
	const username = request.session.username;
	console.log("session username: " + username);



	// check if book in favourites
	try {
		const inFavourites = await checkFavourites(username, bookID);
		console.log('back from check favs')
		console.log("infavourites: " + inFavourites);
		if (inFavourites) {
			response.status(409).send('Already in favourites');
			return;
		}
	} catch (error) {
		console.log('error after checking favs');
		response.status(500).json({ error: 'Internal Server Error' });
		return;
	}


	// see if book already in DB, if not, add it
	try {
		const inDB = await checkDBForBook(bookID, bookObj);
		if (inDB) {
			console.log('book already in DB');
		} else {
			console.log("added book to DB")
		}
		console.log('book added to favourites')
		response.status(200).send("book added to favourites");
		return;
	} catch (error) {
		console.log('error after checking DB');
		response.status(500).json({ error: 'Internal Server Error' });
	}

}


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
